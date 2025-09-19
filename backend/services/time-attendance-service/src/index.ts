import express from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  setupMiddleware, 
  errorHandler, 
  notFoundHandler, 
  healthCheck, 
  createLogger,
  initializeTracing,
  getTracer,
  MetricsService,
  initializeSecretsManager,
  getSecretsManager,
  createVersioningMiddleware,
  circuitBreakerManager
} from '@hrms/shared';
import { getServiceConfig, validateServiceConfig } from '@hrms/shared';
import { createRoutes } from './routes';
import { ExternalService } from './services/external.service';

const logger = createLogger('time-attendance-service');
const app = express();
let prismaClient: PrismaClient;
let externalService: ExternalService;

// Get service configuration from shared service
const timeAttendanceConfig = getServiceConfig('time-attendance-service');

// Validate configuration
try {
  validateServiceConfig('time-attendance-service');
  logger.info('Time & Attendance service configuration validated successfully');
} catch (error) {
  logger.error('Configuration validation failed', error as Error);
  process.exit(1);
}

/**
 * Initialize database connection
 */
async function initializeDatabase(): Promise<void> {
  try {
    prismaClient = new PrismaClient({
      log: [
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    });

    await prismaClient.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database initialization failed', error as Error);
    throw error;
  }
}

/**
 * Initialize enhanced services
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize distributed tracing
    initializeTracing({
      serviceName: 'time-attendance-service',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      sampler: {
        type: 'const',
        param: 1, // Sample all traces in development
      },
    });
    logger.info('Distributed tracing initialized');

    // Initialize metrics
    const metrics = MetricsService.getInstance('time-attendance-service');
    logger.info('Metrics service initialized');

    // Initialize secrets management
    try {
      initializeSecretsManager({
        endpoint: process.env.VAULT_ENDPOINT || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN || 'myroot',
      });
      logger.info('Secrets manager initialized');
      
      // Load secrets from Vault
      const secretsManager = getSecretsManager();
      const dbSecrets = await secretsManager.getSecret('secret/data/database/attendance');
      const jwtSecrets = await secretsManager.getSecret('secret/data/jwt/attendance');
      
      if (dbSecrets || jwtSecrets) {
        logger.info('Secrets loaded from Vault');
      }
    } catch (error) {
      logger.warn('Secrets manager initialization failed, using environment variables', error as Error);
    }

    // Initialize external services (Kafka)
    externalService = new ExternalService();
    await externalService.initialize();
    logger.info('External services initialized successfully');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed', error as Error);
    throw error;
  }
}

/**
 * Setup enhanced middleware
 */
function setupEnhancedMiddleware(): void {
  // Distributed tracing middleware (should be first)
  const tracer = getTracer();
  app.use(tracer.createExpressMiddleware());

  // Metrics collection middleware
  const metrics = MetricsService.getInstance('time-attendance-service');
  app.use(metrics.createExpressMiddleware('time-attendance-service') as any);

  // API versioning middleware
  app.use(createVersioningMiddleware({
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    deprecatedVersions: [],
    headerName: 'X-API-Version',
    urlPrefix: '/api',
    strictMode: false,
  }) as any);

  // Setup standard middleware from shared service
  setupMiddleware(app as any);

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

  // Enhanced health check endpoint
  app.get('/health', (req: any, res: any) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      service: 'time-attendance-service',
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
      },
    };
    
    res.json(healthStatus);
  });

  logger.info('Enhanced middleware setup completed');
}

/**
 * Setup routes
 */
function setupRoutes(): void {
  const routes = createRoutes(prismaClient, externalService);
  app.use(routes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler as any);
  app.use(errorHandler as any);

  logger.info('Routes setup completed');
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Cleanup external services
    if (externalService) {
      await externalService.cleanup();
      logger.info('External services cleaned up');
    }

    // Disconnect from database
    if (prismaClient) {
      await prismaClient.$disconnect();
      logger.info('Database connection closed');
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

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection: ' + reason);
  process.exit(1);
});

/**
 * Start server
 */
async function startServer(): Promise<any> {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize enhanced services
    await initializeServices();

    // Setup enhanced middleware
    setupEnhancedMiddleware();

    // Setup routes
    setupRoutes();

    // Start HTTP server
    const server = app.listen(timeAttendanceConfig.port, timeAttendanceConfig.host, () => {
      logger.info(`⏰ Time & Attendance Service running on ${timeAttendanceConfig.host}:${timeAttendanceConfig.port}`, {
        env: process.env.NODE_ENV || 'development',
        port: timeAttendanceConfig.port,
        host: timeAttendanceConfig.host,
        nodeVersion: process.version,
        databaseUrl: timeAttendanceConfig.database.url.replace(/:[^:@]*@/, ':***@'), // Hide password
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error);
      process.exit(1);
    });

    // Log startup completion
    logger.info('Time & Attendance Service startup completed successfully', {
      env: process.env.NODE_ENV || 'development',
      port: timeAttendanceConfig.port,
      nodeVersion: process.version,
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        circuitBreaker: true,
        timeTracking: true,
        attendanceMonitoring: true,
        leaveManagement: true,
        overtimeTracking: true,
        shiftManagement: true,
        reportingAnalytics: true,
        realTimeNotifications: true,
        auditLogging: true,
      },
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start Time & Attendance Service', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
