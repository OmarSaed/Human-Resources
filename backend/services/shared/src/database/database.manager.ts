import { PrismaClient } from '@prisma/client';
import Redis from 'redis';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import { RedisRepository } from './redis.repository';

const logger = createLogger('database-manager');

/**
 * Database connection manager for all database types
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private prismaClient: PrismaClient | null = null;
  private redisClient: Redis.RedisClientType | null = null;
  private redisRepository: RedisRepository | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize all database connections
   */
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.initializePrisma(),
        this.initializeRedis(),
      ]);

      logger.info('All database connections initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connections', error as Error);
      throw error;
    }
  }

  /**
   * Initialize Prisma (PostgreSQL) connection
   */
  async initializePrisma(): Promise<void> {
    try {
      this.prismaClient = new PrismaClient({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'info', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
      });

      // Log database queries in development
      if (config.env === 'development') {
        this.prismaClient.$on('query', (e: any) => {
          logger.debug('Prisma Query', {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
          });
        });
      }

      // Log errors
      this.prismaClient.$on('error', (e: any) => {
        logger.error('Prisma Error', e);
      });

      await this.prismaClient.$connect();
      logger.info('Prisma (PostgreSQL) connection established');
    } catch (error) {
      logger.error('Failed to initialize Prisma connection', error as Error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis(): Promise<void> {
    try {
      this.redisClient = Redis.createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis connection error', error);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connection established');
      });

      this.redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.redisClient.on('reconnecting', () => {
        logger.warn('Redis client reconnecting');
      });

      await this.redisClient.connect();
      
      // Initialize Redis repository
      this.redisRepository = new RedisRepository(this.redisClient);
      
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to initialize Redis connection', error as Error);
      throw error;
    }
  }

  /**
   * Get Prisma client instance
   */
  getPrismaClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Prisma client not initialized. Call initialize() first.');
    }
    return this.prismaClient;
  }

  /**
   * Get Redis client instance
   */
  getRedisClient(): Redis.RedisClientType {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized. Call initialize() first.');
    }
    return this.redisClient;
  }

  /**
   * Get Redis repository instance
   */
  getRedisRepository(): RedisRepository {
    if (!this.redisRepository) {
      throw new Error('Redis repository not initialized. Call initialize() first.');
    }
    return this.redisRepository;
  }

  /**
   * Health check for all databases
   */
  async healthCheck(): Promise<{
    prisma: boolean;
    redis: boolean;
    overall: boolean;
  }> {
    const health = {
      prisma: false,
      redis: false,
      overall: false,
    };

    try {
      // Check Prisma connection
      if (this.prismaClient) {
        await this.prismaClient.$queryRaw`SELECT 1`;
        health.prisma = true;
      }
    } catch (error) {
      logger.error('Prisma health check failed', error as Error);
    }

    try {
      // Check Redis connection
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      logger.error('Redis health check failed', error as Error);
    }

    health.overall = health.prisma && health.redis;
    
    return health;
  }

  /**
   * Execute database transaction across multiple operations
   */
  async executeTransaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    if (!this.prismaClient) {
      throw new Error('Prisma client not initialized');
    }

    return this.prismaClient.$transaction(callback);
  }

  /**
   * Gracefully close all database connections
   */
  async disconnect(): Promise<void> {
    try {
      const disconnectPromises: Promise<void>[] = [];

      if (this.prismaClient) {
        disconnectPromises.push(this.prismaClient.$disconnect());
      }

      if (this.redisClient) {
        disconnectPromises.push(this.redisClient.disconnect());
      }

      await Promise.all(disconnectPromises);
      
      this.prismaClient = null;
      this.redisClient = null;
      this.redisRepository = null;

      logger.info('All database connections closed successfully');
    } catch (error) {
      logger.error('Error closing database connections', error as Error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    prisma: {
      connected: boolean;
      queries: number;
    };
    redis: {
      connected: boolean;
      memory: string;
      clients: number;
    };
  }> {
    const stats = {
      prisma: {
        connected: false,
        queries: 0,
      },
      redis: {
        connected: false,
        memory: '0B',
        clients: 0,
      },
    };

    try {
      if (this.prismaClient) {
        // Basic Prisma stats
        stats.prisma.connected = true;
        // Note: Detailed query stats would require additional setup
      }
    } catch (error) {
      logger.error('Failed to get Prisma statistics', error as Error);
    }

    try {
      if (this.redisClient) {
        const info = await this.redisClient.info();
        stats.redis.connected = true;
        
        // Parse Redis info for statistics
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        if (memoryMatch) {
          stats.redis.memory = memoryMatch[1].trim();
        }

        const clientsMatch = info.match(/connected_clients:(\d+)/);
        if (clientsMatch) {
          stats.redis.clients = parseInt(clientsMatch[1]);
        }
      }
    } catch (error) {
      logger.error('Failed to get Redis statistics', error as Error);
    }

    return stats;
  }

  /**
   * Clear all Redis cache (use with caution)
   */
  async clearCache(): Promise<void> {
    if (!this.redisRepository) {
      throw new Error('Redis repository not initialized');
    }

    await this.redisRepository.flushAll();
    logger.warn('All Redis cache cleared');
  }

  /**
   * Backup data (placeholder for implementation)
   */
  async backup(): Promise<string> {
    // This would implement database backup logic
    // For now, return a placeholder
    const timestamp = new Date().toISOString();
    logger.info('Database backup initiated', { timestamp });
    return `backup_${timestamp}`;
  }
}
