import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { 
  createLogger, 
  errorHandler, 
  notFoundHandler,
  initializeTracing,
  getTracer,
  MetricsService,
  metricsService,
  initializeSecretsManager,
  getSecretsManager,
  createVersioningMiddleware,
  circuitBreakerManager,
  AuditService,
  NotificationService
} from '@hrms/shared';
import { getServiceConfig, validateServiceConfig } from '@hrms/shared';
import { ServiceDiscovery } from './services/service-discovery';
import { ProxyService } from './services/proxy.service';
import { RateLimiterFactory } from './middleware/rate-limiter';
import { setupRoutes } from './routes';
import Redis from 'redis';

const logger = createLogger('api-gateway');
const app = express();

// Global variables
let serviceDiscovery: ServiceDiscovery;
let proxyService: ProxyService;
let rateLimiterFactory: RateLimiterFactory;
let redisClient: Redis.RedisClientType;
let auditService: AuditService;
let notificationService: NotificationService;

// Get service configuration from shared service
const config = getServiceConfig('api-gateway');
const gatewayConfig = config;

// Validate configuration
try {
  validateServiceConfig('api-gateway');
  logger.info('Gateway configuration validated successfully');
} catch (error) {
  logger.error('Configuration validation failed', error as Error);
  process.exit(1);
}

/**
 * Initialize Redis connection
 */
async function initializeRedis(): Promise<void> {
  try {
    redisClient = Redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connection established');
    });

    await redisClient.connect();
    logger.info('Redis client connected successfully');
  } catch (error: any) {
    logger.warn('Redis connection failed, rate limiting will use memory store', error);
    // Continue without Redis - rate limiting will use memory store
  }
}

/**
 * Initialize core services
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize distributed tracing
    initializeTracing({
      serviceName: 'api-gateway',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      sampler: {
        type: 'const',
        param: 1, // Sample all traces in development
      },
    });
    logger.info('Distributed tracing initialized');

    // Initialize metrics
    const metrics = MetricsService.getInstance('api-gateway');
    logger.info('Metrics service initialized');

    // Initialize secrets management
    try {
      initializeSecretsManager({
        endpoint: process.env.VAULT_ENDPOINT || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN || 'myroot',
      });
      logger.info('Secrets manager initialized');
    } catch (error) {
      logger.warn('Secrets manager initialization failed, using environment variables', error as Error);
    }

    // Initialize Redis
    await initializeRedis();

    // Initialize service discovery
    serviceDiscovery = new ServiceDiscovery();
    serviceDiscovery.startMonitoring();
    
    // Set up event listeners
    (serviceDiscovery as any).on('service-failed', (data: any) => {
      logger.warn('Service failure detected', data);
      // Update circuit breaker metrics
      metrics.updateCircuitBreakerState('api-gateway', data.serviceName, 'OPEN');
    });

    (serviceDiscovery as any).on('service-recovered', (data: any) => {
      logger.info('Service recovery detected', data);
      // Update circuit breaker metrics
      metrics.updateCircuitBreakerState('api-gateway', data.serviceName, 'CLOSED');
    });

    // Initialize proxy service with circuit breakers
    proxyService = new ProxyService(serviceDiscovery);

    // Initialize rate limiter
    rateLimiterFactory = new RateLimiterFactory(redisClient);

    // Initialize shared services
    auditService = new AuditService('api-gateway');
    notificationService = new NotificationService('api-gateway');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed', error as Error);
    throw error;
  }
}

/**
 * Setup middleware
 */
function setupMiddleware(): void {
  // Distributed tracing middleware (should be first)
  const tracer = getTracer();
  app.use(tracer.createExpressMiddleware());

  // Metrics collection middleware
  const metrics = MetricsService.getInstance('api-gateway');
  app.use(metrics.createExpressMiddleware('api-gateway'));

  // API versioning middleware
  const versioningMiddleware = createVersioningMiddleware({
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    deprecatedVersions: ['v1'],
    headerName: 'X-API-Version',
    urlPrefix: '/api',
    strictMode: false,
  });
  app.use(versioningMiddleware as any);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: gatewayConfig.security.corsOrigins,
    credentials: gatewayConfig.security.corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Correlation-ID',
      'X-Request-ID',
      'X-API-Version',
      'X-Trace-ID',
    ],
    exposedHeaders: [
      'X-Gateway-Service',
      'X-Gateway-Version',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-API-Version',
      'X-Trace-ID',
      'Warning',
      'Sunset',
    ],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ 
    limit: gatewayConfig.security.requestSizeLimit,
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: gatewayConfig.security.requestSizeLimit,
  }));

  // Request ID and timing
  app.use((req: any, res: any, next: any) => {
    (req as any).requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (req as any).startTime = Date.now();
    
    res.setHeader('X-Request-ID', (req as any).requestId);
    res.setHeader('X-Gateway-Version', '2.0.0');
    
    // Add trace ID from span if available
    if (req.span) {
      const traceId = req.span.context().toTraceId();
      res.setHeader('X-Trace-ID', traceId);
    }
    
    next();
  });

  // Request logging with trace context
  app.use((req: any, res: any, next: any) => {
    const logData: any = {
      requestId: (req as any).requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      apiVersion: req.apiVersion,
      correlationId: req.correlationId,
    };

    if (req.span) {
      logData.traceId = req.span.context().toTraceId();
      logData.spanId = req.span.context().toSpanId();
    }

    logger.info('Incoming request', logData);
    next();
  });

  // Rate limiting
  if (gatewayConfig.rateLimiting.global.maxRequests > 0) {
    app.use(rateLimiterFactory.createGlobalLimiter());
  }

  // Auth-specific rate limiting
  app.use('/api/v1/auth', rateLimiterFactory.createAuthLimiter());

  // User-based rate limiting (applied after authentication)
  app.use(rateLimiterFactory.createUserLimiter());

  // API key rate limiting
  app.use('/api/external', rateLimiterFactory.createApiKeyLimiter());

  // Metrics endpoint
  app.get('/metrics', async (req: any, res: any) => {
    try {
      const metricsData = await metrics.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metricsData);
    } catch (error) {
      logger.error('Failed to get metrics', error as Error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      services: serviceDiscovery ? serviceDiscovery.getSystemHealth() : { status: 'unknown' },
    };
    
    res.json(healthStatus);
  });

  // Circuit breaker status endpoint
  app.get('/circuit-breakers', (req: any, res: any) => {
    const stats = circuitBreakerManager.getAllStats();
    res.json(stats);
  });

  logger.info('Middleware setup completed');
}

/**
 * Setup routes
 */
function setupApplicationRoutes(): void {
  const routes = setupRoutes(serviceDiscovery, proxyService);
  app.use(routes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Routes setup completed');
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop service discovery monitoring
    if (serviceDiscovery) {
      serviceDiscovery.stopMonitoring();
    }

    // Close Redis connection
    if (redisClient) {
      await redisClient.disconnect();
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
}

/**
 * Error handlers
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: any) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: any) => {
  // Don't exit for vault connection errors - they're not critical for API Gateway operation
  if (reason?.code === 'ECONNREFUSED') {
    logger.warn('Vault connection failed - continuing without vault secrets', { reason });
    return;
  }
  
  logger.error('Unhandled rejection', { promise, reason });
  process.exit(1);
});

/**
 * Start server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize services
    await initializeServices();

    // Setup middleware
    setupMiddleware();

    // Setup routes
    setupApplicationRoutes();

    // Start HTTP server
    const server = app.listen(gatewayConfig.port, gatewayConfig.host, () => {
      logger.info(`🌐 API Gateway running on ${gatewayConfig.host}:${gatewayConfig.port}`, {
        env: config.env,
        port: gatewayConfig.port,
        host: gatewayConfig.host,
        nodeVersion: process.version,
        services: Object.keys(gatewayConfig.services),
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error);
      process.exit(1);
    });

    // Log startup completion
    logger.info('API Gateway startup completed successfully', {
      servicesConfigured: Object.keys(gatewayConfig.services).length,
      rateLimitingEnabled: gatewayConfig.rateLimiting.global.maxRequests > 0,
      circuitBreakerEnabled: gatewayConfig.circuitBreaker.enabled,
      metricsEnabled: gatewayConfig.monitoring.enableMetrics,
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start API Gateway', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
