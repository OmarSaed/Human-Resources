import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const authConfig = getServiceConfig('auth-service');
import { SessionData } from '../types/auth.types';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('session-service');
const prisma = new PrismaClient();
const redis = createClient({
  socket: {
    host: authConfig.redis.host,
    port: authConfig.redis.port,
  },
  password: authConfig.redis.password,
  database: authConfig.redis.db,
});

export class SessionService {
  /**
   * Initialize session service
   */
  static async initialize(): Promise<void> {
    try {
      await redis.connect();
      logger.info('Session service initialized with Redis');
    } catch (error) {
      logger.error('Failed to initialize session service', error as Error);
      throw new Error('Session service initialization failed');
    }
  }

  /**
   * Create new session
   */
  static async createSession(
    userId: string,
    sessionData: Omit<SessionData, 'userId' | 'lastActivity'>
  ): Promise<string> {
    try {
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + authConfig.session.ttl * 1000);

      const fullSessionData: SessionData = {
        ...sessionData,
        userId,
        lastActivity: new Date(),
      };

      // Store in Redis for fast access
      await redis.setEx(
        `session:${sessionId}`,
        authConfig.session.ttl,
        JSON.stringify(fullSessionData)
      );

      // Store in database for persistence
      await prisma.session.create({
        data: {
          id: sessionId,
          userId,
          sessionId,
          data: fullSessionData as any,
          expiresAt,
          userAgent: sessionData.userAgent,
          ipAddress: sessionData.ipAddress,
          device: sessionData.device,
          location: sessionData.location,
        },
      });

      // Cleanup old sessions if user has too many
      await this.cleanupOldUserSessions(userId);

      logger.info('Session created', {
        sessionId,
        userId,
        expiresAt,
      });

      return sessionId;
    } catch (error) {
      logger.error('Failed to create session', error as Error);
      throw new Error('Session creation failed');
    }
  }

  /**
   * Get session data
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      // Try Redis first for performance
      const redisData = await redis.get(`session:${sessionId}`);
      if (redisData) {
        const sessionData = JSON.parse(redisData);
        sessionData.lastActivity = new Date(sessionData.lastActivity);
        return sessionData;
      }

      // Fallback to database
      const dbSession = await prisma.session.findUnique({
        where: { sessionId },
      });

      if (!dbSession || dbSession.expiresAt < new Date()) {
        return null;
      }

      // Restore to Redis
      const remainingTtl = Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000);
      if (remainingTtl > 0) {
        await redis.setEx(
          `session:${sessionId}`,
          remainingTtl,
          JSON.stringify(dbSession.data)
        );
      }

      return dbSession.data as unknown as SessionData;
    } catch (error) {
      logger.error('Failed to get session', error as Error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return;

      session.lastActivity = new Date();

      // Update Redis
      await redis.setEx(
        `session:${sessionId}`,
        authConfig.session.ttl,
        JSON.stringify(session)
      );

      // Update database
      await prisma.session.update({
        where: { sessionId },
        data: {
          data: session as any,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update session activity', error as Error);
    }
  }

  /**
   * Destroy session
   */
  static async destroySession(sessionId: string): Promise<void> {
    try {
      // Remove from Redis
      await redis.del(`session:${sessionId}`);

      // Remove from database
      await prisma.session.delete({
        where: { sessionId },
      });

      logger.info('Session destroyed', { sessionId });
    } catch (error) {
      logger.error('Failed to destroy session', error as Error);
    }
  }

  /**
   * Destroy all user sessions
   */
  static async destroyAllUserSessions(userId: string): Promise<void> {
    try {
      // Get all user sessions
      const sessions = await prisma.session.findMany({
        where: { userId },
        select: { sessionId: true },
      });

      // Remove from Redis
      if (sessions.length > 0) {
        const redisKeys = sessions.map((s: any) => `session:${s.sessionId}`);
        await redis.del(redisKeys);
      }

      // Remove from database
      await prisma.session.deleteMany({
        where: { userId },
      });

      logger.info('All user sessions destroyed', {
        userId,
        sessionCount: sessions.length,
      });
    } catch (error) {
      logger.error('Failed to destroy all user sessions', error as Error);
    }
  }

  /**
   * Get user active sessions
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return sessions.map((session: any) => ({
        id: session.sessionId,
        device: session.device,
        location: session.location,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: (session.data as unknown as SessionData).lastActivity,
        expiresAt: session.expiresAt,
      }));
    } catch (error) {
      logger.error('Failed to get user sessions', error as Error);
      return [];
    }
  }

  /**
   * Validate session
   */
  static async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return false;
      }

      // Check if session is too old
      const maxAge = authConfig.session.ttl * 1000;
      const age = Date.now() - session.lastActivity.getTime();
      
      if (age > maxAge) {
        await this.destroySession(sessionId);
        return false;
      }

      // Update last activity
      await this.updateSessionActivity(sessionId);
      
      return true;
    } catch (error) {
      logger.error('Session validation failed', error as Error);
      return false;
    }
  }

  /**
   * Extend session
   */
  static async extendSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return;

      const newExpiresAt = new Date(Date.now() + authConfig.session.ttl * 1000);

      // Update Redis TTL
      await redis.expire(`session:${sessionId}`, authConfig.session.ttl);

      // Update database
      await prisma.session.update({
        where: { sessionId },
        data: {
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
        },
      });

      logger.debug('Session extended', {
        sessionId,
        newExpiresAt,
      });
    } catch (error) {
      logger.error('Failed to extend session', error as Error);
    }
  }

  /**
   * Cleanup expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const deletedSessions = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      logger.info('Expired sessions cleaned up', {
        deletedCount: deletedSessions.count,
      });
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', error as Error);
    }
  }

  /**
   * Cleanup old user sessions to enforce max sessions limit
   */
  private static async cleanupOldUserSessions(userId: string): Promise<void> {
    try {
      const sessionCount = await prisma.session.count({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
      });

      if (sessionCount >= authConfig.session.maxSessions) {
        // Get oldest sessions to delete
        const oldSessions = await prisma.session.findMany({
          where: {
            userId,
            expiresAt: { gt: new Date() },
          },
          orderBy: { updatedAt: 'asc' },
          take: sessionCount - authConfig.session.maxSessions + 1,
        });

        // Remove from Redis
        const redisKeys = oldSessions.map((s: any) => `session:${s.sessionId}`);
        if (redisKeys.length > 0) {
          await redis.del(redisKeys);
        }

        // Remove from database
        const sessionIds = oldSessions.map((s: any) => s.sessionId);
        await prisma.session.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });

        logger.info('Old user sessions cleaned up', {
          userId,
          deletedCount: oldSessions.length,
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old user sessions', error as Error);
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStatistics(): Promise<{
    activeSessions: number;
    activeUsers: number;
    averageSessionDuration: number;
    sessionsLast24h: number;
  }> {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        activeSessions,
        activeUsers,
        sessionsLast24h,
        recentSessions,
      ] = await Promise.all([
        prisma.session.count({
          where: { expiresAt: { gt: now } },
        }),
        prisma.session.groupBy({
          by: ['userId'],
          where: { expiresAt: { gt: now } },
        }),
        prisma.session.count({
          where: { createdAt: { gte: last24h } },
        }),
        prisma.session.findMany({
          where: {
            createdAt: { gte: last24h },
            expiresAt: { lt: now },
          },
          select: { createdAt: true, updatedAt: true },
        }),
      ]);

      // Calculate average session duration
      const totalDuration = recentSessions.reduce((sum: any, session: any) => {
        return sum + (session.updatedAt.getTime() - session.createdAt.getTime());
      }, 0);

      const averageSessionDuration = recentSessions.length > 0
        ? totalDuration / recentSessions.length / 1000 / 60 // in minutes
        : 0;

      return {
        activeSessions,
        activeUsers: activeUsers.length,
        averageSessionDuration: Math.round(averageSessionDuration),
        sessionsLast24h,
      };
    } catch (error) {
      logger.error('Failed to get session statistics', error as Error);
      return {
        activeSessions: 0,
        activeUsers: 0,
        averageSessionDuration: 0,
        sessionsLast24h: 0,
      };
    }
  }

  /**
   * Force logout user from all devices
   */
  static async forceLogoutUser(userId: string, reason?: string): Promise<void> {
    try {
      await this.destroyAllUserSessions(userId);

      // Also revoke all refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      logger.warn('User force logged out', {
        userId,
        reason,
      });
    } catch (error) {
      logger.error('Failed to force logout user', error as Error);
    }
  }
}
