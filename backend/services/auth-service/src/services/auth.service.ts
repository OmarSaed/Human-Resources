import { PrismaClient} from '@prisma/client';
import { createLogger, EventFactory, SYSTEM_EVENT_TYPES, AuditService } from '@hrms/shared';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  UserProfile,
  AuthError,
  AuthErrorCode,
} from '../types/auth.types';
import { getServiceConfig } from '@hrms/shared';

const authConfig = getServiceConfig('auth-service');
import { UserService } from './user.service';
import { PasswordService } from './password.service';
import { JWTService } from './jwt.service';
import { MFAService } from './mfa.service';
import { SessionService } from './session.service';
import { EmailService } from './email.service';

const logger = createLogger('auth-service');
const prisma = new PrismaClient();
const auditService = new AuditService('auth-service');

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(
    loginData: LoginRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    const { email, password, mfaCode, rememberMe } = loginData;

    try {
      // Rate limiting check (simplified for now)
      // TODO: Implement proper failed login attempt tracking
      const failedAttempts = 0;

      if (failedAttempts >= authConfig.rateLimiting.login.maxAttempts) {
        throw new AuthError(
          AuthErrorCode.RATE_LIMIT_EXCEEDED,
          'Too many failed login attempts. Please try again later.',
          429
        );
      }

      // Get user by email
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        await auditService.logAuthentication(email, 'failed_login', { 
          reason: 'User not found', 
          ipAddress, 
          userAgent 
        });
        throw new AuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        );
      }

      // Check if account is active
      if (!user.isActive) {
        await auditService.logAuthentication(email, 'failed_login', { 
          reason: 'Account disabled', 
          ipAddress, 
          userAgent 
        });
        throw new AuthError(
          AuthErrorCode.ACCOUNT_DISABLED,
          'Account is disabled',
          401
        );
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await auditService.logAuthentication(email, 'failed_login', { 
          reason: 'Account locked', 
          ipAddress, 
          userAgent 
        });
        throw new AuthError(
          AuthErrorCode.ACCOUNT_LOCKED,
          `Account is locked until ${user.lockedUntil.toISOString()}`,
          401
        );
      }

      // Verify password
      const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        // Increment failed login count
        await this.handleFailedLogin(user.id, email, 'Invalid password', ipAddress, userAgent);
        throw new AuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        );
      }

      // Check email verification
      if (!user.emailVerified) {
        throw new AuthError(
          AuthErrorCode.EMAIL_NOT_VERIFIED,
          'Please verify your email address before logging in',
          401
        );
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaCode) {
          return {
            accessToken: '',
            refreshToken: '',
            user: {} as UserProfile,
            expiresIn: 0,
            mfaRequired: true,
          };
        }

        const isMfaValid = await MFAService.verifyMFAToken(user.id, mfaCode);
        if (!isMfaValid) {
          await auditService.logAuthentication(email, 'failed_login', { 
            reason: 'Invalid MFA code', 
            ipAddress, 
            userAgent 
          });
          throw new AuthError(
            AuthErrorCode.INVALID_MFA_CODE,
            'Invalid MFA code',
            401
          );
        }
      }

      // Create session
      const sessionId = await SessionService.createSession(user.id, {
        email: user.email,
        role: user.role,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        device: this.parseDeviceFromUserAgent(userAgent),
        location: await this.getLocationFromIP(ipAddress),
      });

      // Generate tokens
      const userProfile = await UserService.getUserById(user.id);
      if (!userProfile) {
        throw new Error('Failed to get user profile');
      }

      const accessToken = JWTService.generateAccessToken(userProfile, sessionId);
      const { token: refreshToken } = JWTService.generateRefreshToken(user.id);

      // Store refresh token
      const refreshTokenExpiry = new Date(
        Date.now() + this.parseTimeToMs(authConfig.jwt.refreshTokenExpiry)
      );

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiry,
          userAgent,
          ipAddress,
        },
      });

      // Log successful login
      await auditService.logAuthentication(user.id, 'login', {
        email,
        ipAddress,
        userAgent,
        mfaEnabled: user.mfaEnabled
      });

      // Send login alert email if enabled
      if (authConfig.audit.logSuccessfulLogins && ipAddress) {
        try {
          await EmailService.sendLoginAlert(email, ipAddress, userAgent || 'Unknown');
        } catch (error) {
          logger.warn('Failed to send login alert email', error as Error);
        }
      }

      // Publish authentication event
      const event = EventFactory.createSystemEvent(
        SYSTEM_EVENT_TYPES.USER_AUTHENTICATED,
        'auth-service',
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          loginTime: new Date(),
        }
      );

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        sessionId,
        mfaUsed: user.mfaEnabled,
      });

      return {
        accessToken,
        refreshToken,
        user: userProfile,
        expiresIn: this.parseTimeToMs(authConfig.jwt.accessTokenExpiry) / 1000,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logger.error('Login failed', error as Error);
      throw new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Login failed',
        500
      );
    }
  }

  /**
   * Logout user
   */
  static async logout(
    userId: string,
    sessionId: string,
    refreshToken?: string
  ): Promise<void> {
    try {
      // Destroy session
      await SessionService.destroySession(sessionId);

      // Revoke refresh token if provided
      if (refreshToken) {
        await prisma.refreshToken.update({
          where: { token: refreshToken },
          data: { isRevoked: true },
        });
      }

      // Log logout
      await auditService.logAuthentication(userId, 'logout', { 
        action: 'LOGOUT' 
      });

      // Publish logout event
      const event = EventFactory.createSystemEvent(
        SYSTEM_EVENT_TYPES.USER_LOGGED_OUT,
        'auth-service',
        {
          userId,
          logoutTime: new Date(),
        }
      );

      logger.info('User logged out', { userId, sessionId });
    } catch (error) {
      logger.error('Logout failed', error as Error);
      throw new Error('Logout failed');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(
    refreshTokenData: RefreshTokenRequest
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const { refreshToken } = refreshTokenData;

      // Verify refresh token
      const payload = JWTService.verifyRefreshToken(refreshToken);

      // Check if refresh token exists and is not revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        throw new AuthError(
          AuthErrorCode.TOKEN_INVALID,
          'Refresh token is invalid or expired',
          401
        );
      }

      // Get user profile
      const userProfile = await UserService.getUserById(storedToken.userId);
      if (!userProfile) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      // Check if user is still active
      if (!userProfile.isActive) {
        throw new AuthError(
          AuthErrorCode.ACCOUNT_DISABLED,
          'Account is disabled',
          401
        );
      }

      // Generate new access token
      const sessionId = await SessionService.createSession(userProfile.id, {
        email: userProfile.email,
        role: userProfile.role,
        ipAddress: storedToken.ipAddress || 'unknown',
        userAgent: storedToken.userAgent || 'unknown',
      });

      const accessToken = JWTService.generateAccessToken(userProfile, sessionId);

      // Log token refresh
      await auditService.logAction({
        entityType: 'user',
        entityId: userProfile.id,
        action: 'auth.token_refresh',
        userId: userProfile.id,
        metadata: { 
          email: userProfile.email,
          ipAddress: storedToken.ipAddress,
          userAgent: storedToken.userAgent
        }
      });

      logger.info('Token refreshed', {
        userId: userProfile.id,
        sessionId,
      });

      return {
        accessToken,
        expiresIn: this.parseTimeToMs(authConfig.jwt.accessTokenExpiry) / 1000,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logger.error('Token refresh failed', error as Error);
      throw new AuthError(
        AuthErrorCode.TOKEN_INVALID,
        'Token refresh failed',
        401
      );
    }
  }

  /**
   * Validate access token and session
   */
  static async validateToken(token: string): Promise<UserProfile | null> {
    try {
      // Verify JWT
      const payload = JWTService.verifyAccessToken(token);

      // Validate session
      const isSessionValid = await SessionService.validateSession(payload.sessionId);
      if (!isSessionValid) {
        return null;
      }

      // Get current user data
      const userProfile = await UserService.getUserById(payload.userId);
      if (!userProfile || !userProfile.isActive) {
        return null;
      }

      return userProfile;
    } catch (error) {
      logger.debug('Token validation failed', error as Error);
      return null;
    }
  }

  /**
   * Handle failed login attempt
   */
  private static async handleFailedLogin(
    userId: string,
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Increment failed login count
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginCount: { increment: 1 },
        },
      });

      // Check if account should be locked
      const maxFailedAttempts = authConfig.security.accountLockout.maxFailedAttempts;
      if (user.failedLoginCount >= maxFailedAttempts) {
        const lockoutDuration = authConfig.security.accountLockout.lockoutDuration;
        await UserService.lockAccount(userId, lockoutDuration);
      }

      // Log failed attempt
      await auditService.logAuthentication(email, 'failed_login', { 
        reason, 
        ipAddress, 
        userAgent 
      });
    } catch (error) {
      logger.error('Failed to handle failed login', error as Error);
    }
  }

  /**
   * Parse time string to milliseconds
   */
  private static parseTimeToMs(timeString: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time format: ${timeString}`);
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * Parse device information from user agent
   */
  private static parseDeviceFromUserAgent(userAgent?: string): string {
    if (!userAgent) return 'Unknown';

    // Simple device detection
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Get location from IP address (placeholder)
   */
  private static async getLocationFromIP(ipAddress?: string): Promise<string | undefined> {
    // TODO: Implement IP geolocation
    // This could use services like MaxMind GeoIP, ipapi, etc.
    return undefined;
  }

  /**
   * Revoke all user tokens and sessions
   */
  static async revokeAllUserAccess(userId: string): Promise<void> {
    try {
      // Destroy all sessions
      await SessionService.destroyAllUserSessions(userId);

      // Revoke all refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      logger.info('All user access revoked', { userId });
    } catch (error) {
      logger.error('Failed to revoke user access', error as Error);
      throw new Error('Failed to revoke user access');
    }
  }

  /**
   * Get user login sessions
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    return SessionService.getUserSessions(userId);
  }

  /**
   * Terminate specific session
   */
  static async terminateSession(userId: string, sessionId: string): Promise<void> {
    try {
      // Verify session belongs to user
      const session = await SessionService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        throw new AuthError(
          AuthErrorCode.INSUFFICIENT_PERMISSIONS,
          'Session not found or access denied',
          403
        );
      }

      await SessionService.destroySession(sessionId);
      logger.info('Session terminated', { userId, sessionId });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Failed to terminate session', error as Error);
      throw new Error('Failed to terminate session');
    }
  }
}
