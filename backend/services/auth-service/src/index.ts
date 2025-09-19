import express from 'express';
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
  circuitBreakerManager,
  AuditService,
  NotificationService
} from '@hrms/shared';
import { getServiceConfig, validateServiceConfig } from '@hrms/shared';
import authRoutes from './routes/auth.routes';
import { SessionService } from './services/session.service';
import { EmailService } from './services/email.service';
import { PrismaClient } from '@prisma/client';

const logger = createLogger('auth-service');
const app = express();
const prisma = new PrismaClient();

// Global services
let auditService: AuditService;
let notificationService: NotificationService;

// Get service configuration from shared service
const config = getServiceConfig('auth-service');

// Validate configuration
try {
  validateServiceConfig('auth-service');
} catch (error) {
  logger.error('Configuration validation failed', error as Error);
  process.exit(1);
}

// Initialize enhanced services
async function initializeServices(): Promise<void> {
  try {
    // Initialize distributed tracing
    initializeTracing({
      serviceName: 'auth-service',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      sampler: {
        type: 'const',
        param: 1, // Sample all traces in development
      },
    });
    logger.info('Distributed tracing initialized');

    // Initialize metrics
    const metrics = MetricsService.getInstance('auth-service');
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
      const dbSecrets = await secretsManager.getSecret('secret/data/database/auth');
      const jwtSecrets = await secretsManager.getSecret('secret/data/jwt/auth');
      
      if (dbSecrets || jwtSecrets) {
        logger.info('Secrets loaded from Vault');
      }
    } catch (error) {
      logger.warn('Secrets manager initialization failed, using environment variables', error as Error);
    }

    // Initialize database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Initialize session service (Redis connection)
    await SessionService.initialize();
    logger.info('Session service initialized');

    // Initialize email service
    EmailService.initialize();
    logger.info('Email service initialized');

    // Initialize shared services
    auditService = new AuditService('auth-service');
    notificationService = new NotificationService('auth-service');
    logger.info('Shared audit and notification services initialized');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed', error as Error);
    throw error;
  }
}

// Setup enhanced middleware
function setupEnhancedMiddleware(): void {
  // Distributed tracing middleware (should be first)
  const tracer = getTracer();
  app.use(tracer.createExpressMiddleware());

  // Metrics collection middleware
  const metrics = MetricsService.getInstance('auth-service');
  app.use(metrics.createExpressMiddleware('auth-service'));

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
  setupMiddleware(app);

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
      service: 'auth-service',
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
      },
    };
    
    res.json(healthStatus);
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // Other cleanup tasks would go here
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error as Error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: any) => {
  // Don't exit for vault connection errors - they're not critical for auth service operation
  if (reason?.code === 'ECONNREFUSED') {
    logger.warn('Vault connection failed - continuing without vault secrets', { reason });
    return;
  }
  
  logger.error('Unhandled rejection', { promise, reason });
  process.exit(1);
});

// Start server
async function startServer(): Promise<void> {
  try {
    await initializeServices();
    setupEnhancedMiddleware();

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Authentication service running on port ${config.port}`, {
        env: config.env,
        port: config.port,
        nodeVersion: process.version,
        features: {
          tracing: true,
          metrics: true,
          secrets: true,
          versioning: true,
          circuitBreaker: true,
        },
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error as Error);
      process.exit(1);
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
