import NodeCache from 'node-cache';
import Redis from 'redis';
import { createLogger } from '../utils/logger';
import { MetricsService } from '../metrics/prometheus';

const logger = createLogger('multi-level-cache');

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  checkPeriod?: number; // Period for automatic check for expired keys
  useClones?: boolean; // Whether to clone cached values
  deleteOnExpire?: boolean; // Whether to delete expired keys automatically
  namespace?: string; // Cache namespace for Redis
}

export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  l3Hits: number;
  l3Misses: number;
  totalRequests: number;
  hitRate: number;
}

/**
 * Multi-level cache implementation
 * L1: In-memory cache (fastest, limited capacity)
 * L2: Redis cache (fast, distributed)
 * L3: Database/External source (slowest, authoritative)
 */
export class MultiLevelCache {
  private l1Cache: NodeCache; // Level 1: Memory cache
  private l2Cache: Redis.RedisClientType | null = null; // Level 2: Redis cache
  private namespace: string;
  private stats: CacheStats;
  private metricsService: MetricsService;

  constructor(
    private options: CacheOptions = {},
    redisClient?: Redis.RedisClientType
  ) {
    this.namespace = options.namespace || 'cache';
    this.l2Cache = redisClient || null;
    this.metricsService = MetricsService.getInstance('cache');
    
    // Initialize L1 cache (memory)
    this.l1Cache = new NodeCache({
      stdTTL: options.ttl || 600, // 10 minutes default
      checkperiod: options.checkPeriod || 60, // Check every minute
      useClones: options.useClones !== false,
      deleteOnExpire: options.deleteOnExpire !== false,
      maxKeys: 10000, // Limit memory usage
    });

    // Initialize stats
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      l3Hits: 0,
      l3Misses: 0,
      totalRequests: 0,
      hitRate: 0,
    };

    // Set up cache event listeners
    this.setupEventListeners();
    
    logger.info('Multi-level cache initialized', {
      namespace: this.namespace,
      l1Enabled: true,
      l2Enabled: !!this.l2Cache,
      defaultTTL: options.ttl || 600,
    });
  }

  /**
   * Get value from cache with fallback through levels
   */
  async get<T>(key: string, fallbackFn?: () => Promise<T>, ttl?: number): Promise<T | null> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    try {
      // L1 Cache (Memory) - Fastest
      const l1Value = this.l1Cache.get<T>(key);
      if (l1Value !== undefined) {
        this.stats.l1Hits++;
        this.recordCacheHit('l1', Date.now() - startTime);
        logger.debug('Cache hit L1', { key, level: 'L1' });
        return l1Value;
      }
      this.stats.l1Misses++;

      // L2 Cache (Redis) - Fast, distributed
      if (this.l2Cache) {
        try {
          const l2Value = await this.l2Cache.get(this.getRedisKey(key));
          if (l2Value) {
            const parsedValue = JSON.parse(l2Value);
            this.stats.l2Hits++;
            
            // Populate L1 cache
            this.l1Cache.set(key, parsedValue, ttl || this.options.ttl || 3600);
            
            this.recordCacheHit('l2', Date.now() - startTime);
            logger.debug('Cache hit L2', { key, level: 'L2' });
            return parsedValue;
          }
        } catch (error) {
          logger.warn('Redis cache error', error as Error);
        }
      }
      this.stats.l2Misses++;

      // L3 Fallback (Database/External source) - Slowest but authoritative
      if (fallbackFn) {
        const l3Value = await fallbackFn();
        if (l3Value !== null && l3Value !== undefined) {
          this.stats.l3Hits++;
          
          // Populate both cache levels
          await this.set(key, l3Value, ttl);
          
          this.recordCacheHit('l3', Date.now() - startTime);
          logger.debug('Cache hit L3 (fallback)', { key, level: 'L3' });
          return l3Value;
        }
      }
      
      this.stats.l3Misses++;
      this.recordCacheMiss(Date.now() - startTime);
      return null;
      
    } catch (error) {
      logger.error('Cache get error', error as Error);
      this.recordCacheMiss(Date.now() - startTime);
      return null;
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * Set value in all cache levels
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheTime = ttl || this.options.ttl || 600;
    
    try {
      // Set in L1 cache
      this.l1Cache.set(key, value, cacheTime);
      
      // Set in L2 cache (Redis)
      if (this.l2Cache) {
        try {
          await this.l2Cache.setEx(
            this.getRedisKey(key),
            cacheTime,
            JSON.stringify(value)
          );
        } catch (error) {
          logger.warn('Redis cache set error', error as Error);
        }
      }
      
      logger.debug('Cache set', { key, ttl: cacheTime });
    } catch (error) {
      logger.error('Cache set error', error as Error);
    }
  }

  /**
   * Delete from all cache levels
   */
  async del(key: string): Promise<void> {
    try {
      // Delete from L1
      this.l1Cache.del(key);
      
      // Delete from L2
      if (this.l2Cache) {
        try {
          await this.l2Cache.del(this.getRedisKey(key));
        } catch (error) {
          logger.warn('Redis cache delete error', error as Error);
        }
      }
      
      logger.debug('Cache delete', { key });
    } catch (error) {
      logger.error('Cache delete error', error as Error);
    }
  }

  /**
   * Clear entire cache namespace
   */
  async clear(): Promise<void> {
    try {
      // Clear L1
      this.l1Cache.flushAll();
      
      // Clear L2 (Redis) namespace
      if (this.l2Cache) {
        try {
          const pattern = `${this.namespace}:*`;
          const keys = await this.l2Cache.keys(pattern);
          if (keys.length > 0) {
            await this.l2Cache.del(keys);
          }
        } catch (error) {
          logger.warn('Redis cache clear error', error as Error);
        }
      }
      
      // Reset stats
      this.resetStats();
      
      logger.info('Cache cleared', { namespace: this.namespace });
    } catch (error) {
      logger.error('Cache clear error', error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache keys (L1 only for performance)
   */
  getKeys(): string[] {
    return this.l1Cache.keys();
  }

  /**
   * Check if key exists in any cache level
   */
  async has(key: string): Promise<boolean> {
    // Check L1 first
    if (this.l1Cache.has(key)) {
      return true;
    }
    
    // Check L2 (Redis)
    if (this.l2Cache) {
      try {
        const exists = await this.l2Cache.exists(this.getRedisKey(key));
        return exists === 1;
      } catch (error) {
        logger.warn('Redis exists check error', error as Error);
      }
    }
    
    return false;
  }

  /**
   * Get or set pattern - popular caching pattern
   */
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    return this.get(key, fallbackFn, ttl);
  }

  /**
   * Bulk get operations
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    // Try to get all from L1 first
    const l1Results = new Map<string, T>();
    const l1Misses: string[] = [];
    
    for (const key of keys) {
      const value = this.l1Cache.get<T>(key);
      if (value !== undefined) {
        l1Results.set(key, value);
        this.stats.l1Hits++;
      } else {
        l1Misses.push(key);
        this.stats.l1Misses++;
      }
    }
    
    // Try L2 for misses
    const l2Misses: string[] = [];
    if (this.l2Cache && l1Misses.length > 0) {
      try {
        const redisKeys = l1Misses.map(key => this.getRedisKey(key));
        const l2Values = await this.l2Cache.mGet(redisKeys);
        
        for (let i = 0; i < l1Misses.length; i++) {
          const key = l1Misses[i];
          const value = l2Values[i];
          
          if (value) {
            const parsedValue = JSON.parse(value);
            l1Results.set(key, parsedValue);
            
            // Populate L1
            this.l1Cache.set(key, parsedValue);
            this.stats.l2Hits++;
          } else {
            l2Misses.push(key);
            this.stats.l2Misses++;
          }
        }
      } catch (error) {
        logger.warn('Redis mget error', error as Error);
        l2Misses.push(...l1Misses);
      }
    } else {
      l2Misses.push(...l1Misses);
    }
    
    // Combine results
    for (const key of keys) {
      results.set(key, l1Results.get(key) || null);
    }
    
    this.stats.totalRequests += keys.length;
    this.updateHitRate();
    
    return results;
  }

  /**
   * Bulk set operations
   */
  async mset<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    const cacheTime = ttl || this.options.ttl || 600;
    
    // Set in L1
    for (const [key, value] of entries) {
      this.l1Cache.set(key, value, cacheTime);
    }
    
    // Set in L2 (Redis)
    if (this.l2Cache) {
      try {
        const redisEntries: [string, string][] = [];
        for (const [key, value] of entries) {
          redisEntries.push([this.getRedisKey(key), JSON.stringify(value)]);
        }
        
        // Use pipeline for better performance
        const pipeline = this.l2Cache.multi();
        for (const [key, value] of redisEntries) {
          pipeline.setEx(key, cacheTime, value);
        }
        await pipeline.exec();
      } catch (error) {
        logger.warn('Redis mset error', error as Error);
      }
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warm<T>(
    keys: string[],
    loaderFn: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    logger.info('Starting cache warm-up', { keyCount: keys.length });
    
    const promises = keys.map(async (key) => {
      try {
        const exists = await this.has(key);
        if (!exists) {
          const value = await loaderFn(key);
          if (value !== null && value !== undefined) {
            await this.set(key, value, ttl);
          }
        }
      } catch (error) {
        logger.warn('Cache warm-up error for key', { key, error: (error as Error).message });
      }
    });
    
    await Promise.allSettled(promises);
    logger.info('Cache warm-up completed', { keyCount: keys.length });
  }

  /**
   * Cache invalidation by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // L1 - match keys and delete
      const l1Keys = this.l1Cache.keys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      for (const key of l1Keys) {
        if (regex.test(key)) {
          this.l1Cache.del(key);
        }
      }
      
      // L2 - Redis pattern deletion
      if (this.l2Cache) {
        try {
          const redisPattern = `${this.namespace}:${pattern}`;
          const keys = await this.l2Cache.keys(redisPattern);
          if (keys.length > 0) {
            await this.l2Cache.del(keys);
          }
        } catch (error) {
          logger.warn('Redis pattern invalidation error', error as Error);
        }
      }
      
      logger.info('Cache invalidated by pattern', { pattern });
    } catch (error) {
      logger.error('Cache pattern invalidation error', error as Error);
    }
  }

  private getRedisKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private setupEventListeners(): void {
    // L1 Cache events
    this.l1Cache.on('set', (key, value) => {
      logger.debug('L1 cache set', { key });
    });
    
    this.l1Cache.on('del', (key, value) => {
      logger.debug('L1 cache delete', { key });
    });
    
    this.l1Cache.on('expired', (key, value) => {
      logger.debug('L1 cache expired', { key });
    });
  }

  private recordCacheHit(level: string, responseTime: number): void {
    this.metricsService.cacheHitsTotal.inc({ level, cache_name: this.namespace });
    this.metricsService.cacheResponseTime.observe({ level, cache_name: this.namespace }, responseTime / 1000);
  }

  private recordCacheMiss(responseTime: number): void {
    this.metricsService.cacheMissesTotal.inc({ cache_name: this.namespace });
    this.metricsService.cacheResponseTime.observe({ level: 'miss', cache_name: this.namespace }, responseTime / 1000);
  }

  private updateHitRate(): void {
    const totalHits = this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits;
    this.stats.hitRate = this.stats.totalRequests > 0 ? (totalHits / this.stats.totalRequests) * 100 : 0;
  }

  private resetStats(): void {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      l3Hits: 0,
      l3Misses: 0,
      totalRequests: 0,
      hitRate: 0,
    };
  }
}

/**
 * Cache decorator for methods
 */
export function Cacheable(
  key: string | ((args: any[]) => string),
  ttl?: number,
  cache?: MultiLevelCache
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheInstance = cache || (this as any).cache;
      if (!cacheInstance) {
        return method.apply(this, args);
      }
      
      const cacheKey = typeof key === 'function' ? key(args) : key;
      
      return cacheInstance.getOrSet(
        cacheKey,
        () => method.apply(this, args),
        ttl
      );
    };
  };
}

/**
 * Cache invalidation decorator
 */
export function CacheEvict(
  key: string | ((args: any[]) => string),
  cache?: MultiLevelCache
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      const cacheInstance = cache || (this as any).cache;
      if (cacheInstance) {
        const cacheKey = typeof key === 'function' ? key(args) : key;
        await cacheInstance.del(cacheKey);
      }
      
      return result;
    };
  };
}

// Export cache factory
export const createMultiLevelCache = (
  options: CacheOptions = {},
  redisClient?: Redis.RedisClientType
): MultiLevelCache => {
  return new MultiLevelCache(options, redisClient);
};
