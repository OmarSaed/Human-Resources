import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('metrics');

export class MetricsService {
  private static instance: MetricsService;
  
  // HTTP Metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsInFlight: Gauge<string>;
  
  // Database Metrics
  public readonly databaseConnectionsActive: Gauge<string>;
  public readonly databaseConnectionsMax: Gauge<string>;
  public readonly databaseQueryDuration: Histogram<string>;
  public readonly databaseQueriesTotal: Counter<string>;
  
  // Cache Metrics
  public readonly cacheHitsTotal: Counter<string>;
  public readonly cacheMissesTotal: Counter<string>;
  public readonly cacheSize: Gauge<string>;
  public readonly cacheResponseTime: Histogram<string>;
  
  // Business Metrics
  public readonly authFailedAttemptsTotal: Counter<string>;
  public readonly employeesTotal: Gauge<string>;
  public readonly activeSessionsTotal: Gauge<string>;
  
  // Kafka Metrics
  public readonly kafkaMessagesProduced: Counter<string>;
  public readonly kafkaMessagesConsumed: Counter<string>;
  public readonly kafkaConsumerLag: Gauge<string>;
  
  // Circuit Breaker Metrics
  public readonly circuitBreakerState: Gauge<string>;
  public readonly circuitBreakerFailuresTotal: Counter<string>;

  private constructor(serviceName: string) {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ prefix: `${serviceName}_` });

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'service'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status', 'service'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['service'],
    });

    // Database Metrics
    this.databaseConnectionsActive = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      labelNames: ['service', 'database'],
    });

    this.databaseConnectionsMax = new Gauge({
      name: 'database_connections_max',
      help: 'Maximum number of database connections',
      labelNames: ['service', 'database'],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['service', 'operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.databaseQueriesTotal = new Counter({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['service', 'operation', 'table', 'status'],
    });

    // Cache Metrics
    this.cacheHitsTotal = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['service', 'cache_name'],
    });

    this.cacheMissesTotal = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['service', 'cache_name'],
    });

    this.cacheSize = new Gauge({
      name: 'cache_size_bytes',
      help: 'Cache size in bytes',
      labelNames: ['service', 'cache_name'],
    });

    this.cacheResponseTime = new Histogram({
      name: 'cache_response_time_seconds',
      help: 'Cache response time in seconds',
      labelNames: ['service', 'cache_name', 'level'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    });

    // Business Metrics
    this.authFailedAttemptsTotal = new Counter({
      name: 'auth_failed_attempts_total',
      help: 'Total number of failed authentication attempts',
      labelNames: ['service', 'reason'],
    });

    this.employeesTotal = new Gauge({
      name: 'employees_total',
      help: 'Total number of employees',
      labelNames: ['service', 'status'],
    });

    this.activeSessionsTotal = new Gauge({
      name: 'active_sessions_total',
      help: 'Total number of active user sessions',
      labelNames: ['service'],
    });

    // Kafka Metrics
    this.kafkaMessagesProduced = new Counter({
      name: 'kafka_messages_produced_total',
      help: 'Total number of Kafka messages produced',
      labelNames: ['service', 'topic'],
    });

    this.kafkaMessagesConsumed = new Counter({
      name: 'kafka_messages_consumed_total',
      help: 'Total number of Kafka messages consumed',
      labelNames: ['service', 'topic', 'consumer_group'],
    });

    this.kafkaConsumerLag = new Gauge({
      name: 'kafka_consumer_lag_sum',
      help: 'Kafka consumer lag',
      labelNames: ['service', 'topic', 'consumer_group'],
    });

    // Circuit Breaker Metrics
    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['service', 'name'],
    });

    this.circuitBreakerFailuresTotal = new Counter({
      name: 'circuit_breaker_failures_total',
      help: 'Total number of circuit breaker failures',
      labelNames: ['service', 'name'],
    });

    logger.info('Metrics service initialized', { serviceName });
  }

  public static getInstance(serviceName: string = 'unknown'): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService(serviceName);
    }
    return MetricsService.instance;
  }

  /**
   * Create Express middleware for HTTP metrics collection
   */
  createExpressMiddleware(serviceName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const route = req.route?.path || req.path;
      
      // Increment in-flight requests
      this.httpRequestsInFlight.inc({ service: serviceName });

      // Override end to capture metrics
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const duration = (Date.now() - start) / 1000;
        const status = res.statusCode.toString();
        
        // Record metrics
        MetricsService.instance.httpRequestsTotal.inc({
          method: req.method,
          route,
          status,
          service: serviceName,
        });

        MetricsService.instance.httpRequestDuration.observe(
          {
            method: req.method,
            route,
            status,
            service: serviceName,
          },
          duration
        );

        // Decrement in-flight requests
        MetricsService.instance.httpRequestsInFlight.dec({ service: serviceName });

        return originalEnd.apply(this, args as [any, any, any]);
      };

      next();
    };
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    serviceName: string,
    operation: string,
    table: string,
    duration: number,
    success: boolean
  ): void {
    this.databaseQueryDuration.observe(
      { service: serviceName, operation, table },
      duration
    );

    this.databaseQueriesTotal.inc({
      service: serviceName,
      operation,
      table,
      status: success ? 'success' : 'error',
    });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(serviceName: string, cacheName: string): void {
    this.cacheHitsTotal.inc({ service: serviceName, cache_name: cacheName });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(serviceName: string, cacheName: string): void {
    this.cacheMissesTotal.inc({ service: serviceName, cache_name: cacheName });
  }

  /**
   * Update cache size
   */
  updateCacheSize(serviceName: string, cacheName: string, size: number): void {
    this.cacheSize.set({ service: serviceName, cache_name: cacheName }, size);
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAuth(serviceName: string, reason: string): void {
    this.authFailedAttemptsTotal.inc({ service: serviceName, reason });
  }

  /**
   * Update employee count
   */
  updateEmployeeCount(serviceName: string, status: string, count: number): void {
    this.employeesTotal.set({ service: serviceName, status }, count);
  }

  /**
   * Update active sessions count
   */
  updateActiveSessionsCount(serviceName: string, count: number): void {
    this.activeSessionsTotal.set({ service: serviceName }, count);
  }

  /**
   * Record Kafka message produced
   */
  recordKafkaMessageProduced(serviceName: string, topic: string): void {
    this.kafkaMessagesProduced.inc({ service: serviceName, topic });
  }

  /**
   * Record Kafka message consumed
   */
  recordKafkaMessageConsumed(serviceName: string, topic: string, consumerGroup: string): void {
    this.kafkaMessagesConsumed.inc({ service: serviceName, topic, consumer_group: consumerGroup });
  }

  /**
   * Update Kafka consumer lag
   */
  updateKafkaConsumerLag(serviceName: string, topic: string, consumerGroup: string, lag: number): void {
    this.kafkaConsumerLag.set({ service: serviceName, topic, consumer_group: consumerGroup }, lag);
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(serviceName: string, name: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    const stateValue = state === 'CLOSED' ? 0 : state === 'OPEN' ? 1 : 2;
    this.circuitBreakerState.set({ service: serviceName, name }, stateValue);
  }

  /**
   * Record circuit breaker failure
   */
  recordCircuitBreakerFailure(serviceName: string, name: string): void {
    this.circuitBreakerFailuresTotal.inc({ service: serviceName, name });
  }

  /**
   * Get metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    register.clear();
  }
}

// Export singleton
export const metricsService = MetricsService.getInstance();
