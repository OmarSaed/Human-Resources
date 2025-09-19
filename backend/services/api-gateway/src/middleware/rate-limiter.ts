import rateLimit from 'express-rate-limit';
// Note: Using memory store for now, replace with proper Redis store if needed
import Redis from 'redis';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const gatewayConfig = getServiceConfig('api-gateway');

const logger = createLogger('rate-limiter');

/**
 * Rate limiter factory for different rate limiting strategies
 */
export class RateLimiterFactory {
  private redisClient: Redis.RedisClientType | null = null;

  constructor(redisClient?: Redis.RedisClientType) {
    this.redisClient = redisClient || null;
  }

  /**
   * Create global rate limiter
   */
  createGlobalLimiter() {
    return rateLimit({
      windowMs: gatewayConfig.rateLimiting.global.windowMs,
      max: gatewayConfig.rateLimiting.global.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(gatewayConfig.rateLimiting.global.windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.redisClient ? undefined : undefined,
      keyGenerator: (req: Request) => {
        return `global:${this.getClientId(req)}`;
      },
      handler: (req: Request, res: Response) => {
        logger.warn('Global rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
        });
        res.status(429).json({
          data: null,
          errors: [{
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }]
        });
      },
    });
  }

  /**
   * Create authentication endpoint rate limiter
   */
  createAuthLimiter() {
    return rateLimit({
      windowMs: gatewayConfig.rateLimiting.auth.windowMs,
      max: gatewayConfig.rateLimiting.auth.maxRequests,
      message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(gatewayConfig.rateLimiting.auth.windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.redisClient ? undefined : undefined,
      keyGenerator: (req: Request) => {
        return `auth:${this.getClientId(req)}`;
      },
      handler: (req: Request, res: Response) => {
        logger.warn('Auth rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
        });
        res.status(429).json({
          data: null,
          errors: [{
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts, please try again later'
          }]
        });
      },
      skip: (req: Request) => {
        // Skip rate limiting for certain endpoints
        return req.path.includes('/health') || req.path.includes('/metrics');
      },
    });
  }

  /**
   * Create per-user rate limiter
   */
  createUserLimiter() {
    return rateLimit({
      windowMs: gatewayConfig.rateLimiting.perUser.windowMs,
      max: gatewayConfig.rateLimiting.perUser.maxRequests,
      message: {
        error: 'Too many requests from this user, please try again later.',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(gatewayConfig.rateLimiting.perUser.windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.redisClient ? undefined : undefined,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return `user:${user?.id || this.getClientId(req)}`;
      },
      handler: (req: Request, res: Response) => {
        const user = (req as any).user;
        logger.warn('User rate limit exceeded', {
          userId: user?.id,
          ip: req.ip,
          path: req.path,
        });
        res.status(429).json({
          data: null,
          errors: [{
            code: 'USER_RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }]
        });
      },
      skip: (req: Request) => {
        // Skip for non-authenticated requests
        return !(req as any).user;
      },
    });
  }

  /**
   * Create API key rate limiter
   */
  createApiKeyLimiter() {
    return rateLimit({
      windowMs: gatewayConfig.rateLimiting.apiKey.windowMs,
      max: gatewayConfig.rateLimiting.apiKey.maxRequests,
      message: {
        error: 'API key rate limit exceeded, please try again later.',
        code: 'API_KEY_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(gatewayConfig.rateLimiting.apiKey.windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.redisClient ? undefined : undefined,
      keyGenerator: (req: Request) => {
        const apiKey = req.get('X-API-Key') as string;
        return `apikey:${apiKey || this.getClientId(req)}`;
      },
      handler: (req: Request, res: Response) => {
        const apiKey = req.get('X-API-Key') as string;
        logger.warn('API key rate limit exceeded', {
          apiKey: apiKey && typeof apiKey === 'string' ? `${apiKey.substring(0, 8)}...` : 'none',
          ip: req.ip,
          path: req.path,
        });
        res.status(429).json({
          data: null,
          errors: [{
            code: 'API_KEY_RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }]
        });
      },
      skip: (req: Request) => {
        // Skip if no API key provided
        return !req.get('X-API-Key');
      },
    });
  }

  /**
   * Create custom rate limiter for specific endpoints
   */
  createCustomLimiter(options: {
    windowMs: number;
    max: number;
    keyPrefix: string;
    message?: string;
    skipCondition?: (req: Request) => boolean;
  }) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      message: {
        error: options.message || 'Rate limit exceeded',
        code: 'CUSTOM_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(options.windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.redisClient ? undefined : undefined,
      keyGenerator: (req: Request) => {
        return `${options.keyPrefix}:${this.getClientId(req)}`;
      },
      skip: options.skipCondition || (() => false),
    });
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientId(req: Request): string {
    // Try to get the most specific identifier available
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    const apiKey = req.get('X-API-Key') as string;
    if (apiKey) {
      return `apikey:${apiKey}`;
    }

    // Fall back to IP address
    return `ip:${req.ip}`;
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on system load
 */
export class AdaptiveRateLimiter {
  private baseLimits: Map<string, number> = new Map();
  private currentLimits: Map<string, number> = new Map();
  private systemLoad = 0;

  constructor() {
    // Initialize base limits
    this.baseLimits.set('global', gatewayConfig.rateLimiting.global.maxRequests);
    this.baseLimits.set('user', gatewayConfig.rateLimiting.perUser.maxRequests);
    this.baseLimits.set('auth', gatewayConfig.rateLimiting.auth.maxRequests);
    
    // Start with base limits
    this.currentLimits = new Map(this.baseLimits);
  }

  /**
   * Update system load and adjust rate limits accordingly
   */
  updateSystemLoad(load: number): void {
    this.systemLoad = Math.max(0, Math.min(1, load)); // Ensure 0-1 range

    // Adjust limits based on system load
    for (const [key, baseLimit] of this.baseLimits) {
      let adjustedLimit = baseLimit;

      if (this.systemLoad > 0.8) {
        // High load: reduce limits by 50%
        adjustedLimit = Math.floor(baseLimit * 0.5);
      } else if (this.systemLoad > 0.6) {
        // Medium load: reduce limits by 25%
        adjustedLimit = Math.floor(baseLimit * 0.75);
      } else if (this.systemLoad < 0.3) {
        // Low load: increase limits by 25%
        adjustedLimit = Math.floor(baseLimit * 1.25);
      }

      this.currentLimits.set(key, adjustedLimit);
    }

    logger.debug('Rate limits adjusted', {
      systemLoad: this.systemLoad,
      limits: Object.fromEntries(this.currentLimits),
    });
  }

  /**
   * Get current limit for a category
   */
  getCurrentLimit(category: string): number {
    return this.currentLimits.get(category) || this.baseLimits.get(category) || 100;
  }

  /**
   * Create adaptive rate limiter middleware
   */
  createAdaptiveLimiter(category: string, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const currentLimit = this.getCurrentLimit(category);
      
      // Create dynamic rate limiter
      const limiter = rateLimit({
        windowMs,
        max: currentLimit,
        message: {
          error: 'Rate limit exceeded (adaptive)',
          code: 'ADAPTIVE_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
          currentLimit,
          systemLoad: this.systemLoad,
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

      limiter(req, res, next);
    };
  }
}

/**
 * Rate limiting metrics collector
 */
export class RateLimitMetrics {
  private metrics = {
    totalRequests: 0,
    blockedRequests: 0,
    limitsByEndpoint: new Map<string, { requests: number; blocked: number }>(),
  };

  /**
   * Record a request
   */
  recordRequest(endpoint: string, blocked: boolean = false): void {
    this.metrics.totalRequests++;
    
    if (blocked) {
      this.metrics.blockedRequests++;
    }

    const endpointMetrics = this.metrics.limitsByEndpoint.get(endpoint) || { requests: 0, blocked: 0 };
    endpointMetrics.requests++;
    
    if (blocked) {
      endpointMetrics.blocked++;
    }

    this.metrics.limitsByEndpoint.set(endpoint, endpointMetrics);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      blockRate: this.metrics.totalRequests > 0 
        ? this.metrics.blockedRequests / this.metrics.totalRequests 
        : 0,
      limitsByEndpoint: Object.fromEntries(this.metrics.limitsByEndpoint),
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      limitsByEndpoint: new Map(),
    };
  }
}
