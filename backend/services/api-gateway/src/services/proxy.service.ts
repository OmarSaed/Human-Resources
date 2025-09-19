import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const gatewayConfig = getServiceConfig('api-gateway');
import { ServiceDiscovery } from './service-discovery';

const logger = createLogger('proxy-service');

export interface ProxyOptions {
  target: string;
  changeOrigin?: boolean;
  timeout?: number;
  retries?: number;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Proxy service for routing requests to microservices
 */
export class ProxyService {
  private serviceDiscovery: ServiceDiscovery;
  private requestCounts = new Map<string, number>();

  constructor(serviceDiscovery: ServiceDiscovery) {
    this.serviceDiscovery = serviceDiscovery;
  }

  /**
   * Create proxy middleware for a specific service
   */
  createServiceProxy(serviceName: string, options?: Partial<ProxyOptions>) {
    return createProxyMiddleware({
      target: 'http://placeholder', // Will be overridden by router
      changeOrigin: options?.changeOrigin ?? gatewayConfig.proxy.changeOrigin,
      timeout: options?.timeout ?? gatewayConfig.proxy.timeout,
      followRedirects: gatewayConfig.proxy.followRedirects,
      
      // Dynamic target resolution
      router: (req) => {
        const instance = this.serviceDiscovery.getBestInstance(serviceName);
        if (!instance) {
          logger.error('No healthy instances available', { service: serviceName });
          throw new Error(`Service ${serviceName} is unavailable`);
        }
        
        logger.debug('Routing request to service instance', {
          service: serviceName,
          instance: instance.id,
          target: instance.url,
          path: req.url,
        });

        return instance.url;
      },

      // Path rewriting
      pathRewrite: options?.pathRewrite || {
        [`^/api/v1/${serviceName}`]: '/api/v1',
      },
     
    });
  }

  /**
   * Create dynamic proxy that can route to multiple services
   */
  createDynamicProxy() {
    return createProxyMiddleware({
      target: 'http://placeholder',
      changeOrigin: gatewayConfig.proxy.changeOrigin,
      timeout: gatewayConfig.proxy.timeout,

      // Dynamic routing based on request path
      router: (req) => {
        const serviceName = this.extractServiceFromPath(req.url || '');
        
        if (!serviceName) {
          throw new Error('Unable to determine target service');
        }

        const instance = this.serviceDiscovery.getBestInstance(serviceName);
        if (!instance) {
          throw new Error(`Service ${serviceName} is unavailable`);
        }

        return instance.url;
      },

      // Dynamic path rewriting
      pathRewrite: (path, req) => {
        const serviceName = this.extractServiceFromPath(path);
        if (serviceName) {
          return path.replace(`/api/v1/${serviceName}`, '/api/v1');
        }
        return path;
      },
    });
  }

  /**
   * Create circuit breaker proxy
   */
  createCircuitBreakerProxy(serviceName: string) {
    let failureCount = 0;
    let lastFailureTime = 0;
    let isCircuitOpen = false;

    return (req: Request, res: Response, next: any) => {
      const now = Date.now();
      
      // Check if circuit should be reset
      if (isCircuitOpen && 
          now - lastFailureTime > gatewayConfig.circuitBreaker.timeout) {
        isCircuitOpen = false;
        failureCount = 0;
        logger.info('Circuit breaker reset', { service: serviceName });
      }

      // If circuit is open, return error immediately
      if (isCircuitOpen) {
        res.status(503).json({
          success: false,
          error: 'Service circuit breaker is open',
          code: 'CIRCUIT_BREAKER_OPEN',
          service: serviceName,
          retryAfter: Math.ceil((gatewayConfig.circuitBreaker.timeout - (now - lastFailureTime)) / 1000),
        });
        return;
      }

      // Create proxy with failure tracking
      const proxy = this.createServiceProxy(serviceName);
      
      // Override error handler to track failures
      const originalOnError = (proxy as any).onError;
      (proxy as any).onError = (err: Error, req: Request, res: Response) => {
        failureCount++;
        lastFailureTime = now;

        if (failureCount >= gatewayConfig.circuitBreaker.threshold) {
          isCircuitOpen = true;
          logger.warn('Circuit breaker opened', {
            service: serviceName,
            failureCount,
            threshold: gatewayConfig.circuitBreaker.threshold,
          });
        }

        // Call original error handler
        if (originalOnError) {
          originalOnError(err, req, res);
        }
      };

      proxy(req, res, next);
    };
  }

  /**
   * Extract service name from request path
   */
  private extractServiceFromPath(path: string): string | null {
    // Expected format: /api/v1/{service}/...
    const match = path.match(/^\/api\/v1\/([^\/]+)/);
    
    if (match) {
      const serviceName = match[1];
      
      // Map some common endpoints to service names
      const serviceMapping: Record<string, string> = {
        'auth': 'auth',
        'employees': 'employee',
        'candidates': 'recruitment',
        'jobs': 'recruitment',
        'performance': 'performance',
        'reviews': 'performance',
        'goals': 'performance',
        'learning': 'learning',
        'courses': 'learning',
        'notifications': 'notification',
        'analytics': 'analytics',
        'reports': 'analytics',
      };

      return serviceMapping[serviceName] || serviceName;
    }

    return null;
  }

  /**
   * Track request metrics
   */
  private trackRequest(serviceName: string): void {
    const currentCount = this.requestCounts.get(serviceName) || 0;
    this.requestCounts.set(serviceName, currentCount + 1);
  }

  /**
   * Get request metrics
   */
  getRequestMetrics(): Record<string, number> {
    return Object.fromEntries(this.requestCounts);
  }

  /**
   * Reset request metrics
   */
  resetMetrics(): void {
    this.requestCounts.clear();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate response time
   */
  private getResponseTime(req: Request): number {
    const startTime = (req as any).startTime || Date.now();
    return Date.now() - startTime;
  }

  /**
   * Health check all services
   */
  async healthCheckAllServices(): Promise<Record<string, any>> {
    return this.serviceDiscovery.getHealthSummary();
  }
}
