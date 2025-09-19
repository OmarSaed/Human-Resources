import Redis from 'redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis-repository');

/**
 * Redis repository for caching and session management
 */
export class RedisRepository {
  private client: Redis.RedisClientType;

  constructor(client: Redis.RedisClientType) {
    this.client = client;
  }

  /**
   * Set key-value pair with optional expiration
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

      logger.debug('Redis SET operation', { key, ttl });
    } catch (error) {
      logger.error('Failed to set Redis key', error as Error);
      throw error;
    }
  }

  /**
   * Get value by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to get Redis key', error as Error);
      throw error;
    }
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      logger.debug('Redis DELETE operation', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete Redis key', error as Error);
      throw error;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(keys);
      logger.debug('Redis DELETE MANY operation', { count: keys.length, deleted: result });
      return result;
    } catch (error) {
      logger.error('Failed to delete multiple Redis keys', error as Error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check Redis key existence', error as Error);
      throw error;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      logger.debug('Redis EXPIRE operation', { key, ttl, success: result });
      return Boolean(result);
    } catch (error) {
      logger.error('Failed to set Redis key expiration', error as Error);
      throw error;
    }
  }

  /**
   * Get time to live for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Failed to get Redis key TTL', error as Error);
      throw error;
    }
  }

  /**
   * Increment numeric value
   */
  async increment(key: string, value: number = 1): Promise<number> {
    try {
      if (value === 1) {
        return await this.client.incr(key);
      } else {
        return await this.client.incrBy(key, value);
      }
    } catch (error) {
      logger.error('Failed to increment Redis key', error as Error);
      throw error;
    }
  }

  /**
   * Decrement numeric value
   */
  async decrement(key: string, value: number = 1): Promise<number> {
    try {
      if (value === 1) {
        return await this.client.decr(key);
      } else {
        return await this.client.decrBy(key, value);
      }
    } catch (error) {
      logger.error('Failed to decrement Redis key', error as Error);
      throw error;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Failed to get Redis keys by pattern', error as Error);
      throw error;
    }
  }

  /**
   * Hash operations
   */
  async hSet(key: string, field: string, value: any): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.hSet(key, field, serializedValue);
      logger.debug('Redis HSET operation', { key, field });
    } catch (error) {
      logger.error('Failed to set Redis hash field', error as Error);
      throw error;
    }
  }

  async hGet<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hGet(key, field);
      
      if (value === undefined || value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to get Redis hash field', error as Error);
      throw error;
    }
  }

  async hGetAll(key: string): Promise<Record<string, any>> {
    try {
      const hash = await this.client.hGetAll(key);
      const result: Record<string, any> = {};

      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value; // Keep as string if not valid JSON
        }
      }

      return result;
    } catch (error) {
      logger.error('Failed to get Redis hash', error as Error);
      throw error;
    }
  }

  async hDel(key: string, field: string): Promise<boolean> {
    try {
      const result = await this.client.hDel(key, field);
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete Redis hash field', error as Error);
      throw error;
    }
  }

  /**
   * List operations
   */
  async lPush(key: string, value: any): Promise<number> {
    try {
      const serializedValue = JSON.stringify(value);
      return await this.client.lPush(key, serializedValue);
    } catch (error) {
      logger.error('Failed to push to Redis list', error as Error);
      throw error;
    }
  }

  async rPop<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.rPop(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to pop from Redis list', error as Error);
      throw error;
    }
  }

  async lRange<T = any>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await this.client.lRange(key, start, stop);
      return values.map(value => JSON.parse(value) as T);
    } catch (error) {
      logger.error('Failed to get Redis list range', error as Error);
      throw error;
    }
  }

  /**
   * Set operations
   */
  async sAdd(key: string, member: any): Promise<number> {
    try {
      const serializedMember = JSON.stringify(member);
      return await this.client.sAdd(key, serializedMember);
    } catch (error) {
      logger.error('Failed to add to Redis set', error as Error);
      throw error;
    }
  }

  async sMembers<T = any>(key: string): Promise<T[]> {
    try {
      const members = await this.client.sMembers(key);
      return members.map(member => JSON.parse(member) as T);
    } catch (error) {
      logger.error('Failed to get Redis set members', error as Error);
      throw error;
    }
  }

  async sIsMember(key: string, member: any): Promise<boolean> {
    try {
      const serializedMember = JSON.stringify(member);
      return Boolean(await this.client.sIsMember(key, serializedMember));
    } catch (error) {
      logger.error('Failed to check Redis set membership', error as Error);
      throw error;
    }
  }

  /**
   * Publish/Subscribe operations
   */
  async publish(channel: string, message: any): Promise<number> {
    try {
      const serializedMessage = JSON.stringify(message);
      return await this.client.publish(channel, serializedMessage);
    } catch (error) {
      logger.error('Failed to publish Redis message', error as Error);
      throw error;
    }
  }

  /**
   * Pipeline operations for batch processing
   */
  pipeline() {
    return this.client.multi();
  }

  /**
   * Flush database (use with caution)
   */
  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      logger.warn('Redis database flushed');
    } catch (error) {
      logger.error('Failed to flush Redis database', error as Error);
      throw error;
    }
  }

  /**
   * Get database info
   */
  async info(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      logger.error('Failed to get Redis info', error as Error);
      throw error;
    }
  }
}
