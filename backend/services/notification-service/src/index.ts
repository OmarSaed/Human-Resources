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
import { NotificationService } from './services/notification.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { EmailService } from './services/email.service';
import { SMSService } from './services/sms.service';
import { PushService } from './services/push.service';
import { QueueService } from './services/queue.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';

const logger = createLogger('notification-service');
const app = express();
let prismaClient: PrismaClient;
let notificationService: NotificationService;
let preferenceService: NotificationPreferenceService;
let templateService: NotificationTemplateService;
let emailService: EmailService;
let smsService: SMSService;
let pushService: PushService;
let queueService: QueueService;
let kafkaConsumer: KafkaConsumerService;

// Get service configuration from shared service
const config = getServiceConfig('notification-service');
const notificationConfig = config;

// Validate configuration
try {
  validateServiceConfig('notification-service');
  logger.info('Notification service configuration validated successfully');
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
      serviceName: 'notification-service',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      sampler: {
        type: 'const',
        param: 1, // Sample all traces in development
      },
    });
    logger.info('Distributed tracing initialized');

    // Initialize metrics
    const metrics = MetricsService.getInstance('notification-service');
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
      const dbSecrets = await secretsManager.getSecret('secret/data/database/notification');
      const emailSecrets = await secretsManager.getSecret('secret/data/email/smtp');
      const smsSecrets = await secretsManager.getSecret('secret/data/sms/twilio');
      const pushSecrets = await secretsManager.getSecret('secret/data/push/firebase');
      
      if (dbSecrets || emailSecrets || smsSecrets || pushSecrets) {
        logger.info('Secrets loaded from Vault');
      }
    } catch (error) {
      logger.warn('Secrets manager initialization failed, using environment variables', error as Error);
    }

    // Initialize notification services
    if (config.features.queue) {
      queueService = new QueueService();
      await queueService.initialize();
      logger.info('Queue service initialized');
    }

    if (config.features.email) {
      emailService = new EmailService();
      await emailService.initialize();
      logger.info('Email service initialized');
    }

    if (config.features.sms) {
      smsService = new SMSService();
      await smsService.initialize();
      logger.info('SMS service initialized');
    }

    if (config.features.push) {
      pushService = new PushService();
      await pushService.initialize();
      logger.info('Push service initialized');
    }

    // Initialize main notification service
    notificationService = new NotificationService(prismaClient);
    logger.info('Notification service initialized');

    // Initialize preference service
    preferenceService = new NotificationPreferenceService(prismaClient);
    logger.info('Notification preference service initialized');

    // Initialize template service
    templateService = new NotificationTemplateService(prismaClient);
    logger.info('Notification template service initialized');

    // Initialize Kafka consumer for cross-service events
    kafkaConsumer = new KafkaConsumerService(notificationService);
    await kafkaConsumer.initialize();
    logger.info('Kafka consumer service initialized');

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
  const metrics = MetricsService.getInstance('notification-service');
  app.use(metrics.createExpressMiddleware('notification-service') as any);

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
      service: 'notification-service',
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        email: config.features.email,
        sms: config.features.sms,
        push: config.features.push,
        queue: config.features.queue,
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
  const routes = createRoutes(prismaClient, notificationService, preferenceService, templateService);
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
    // Cleanup services
    if (kafkaConsumer) {
      await kafkaConsumer.cleanup();
      logger.info('Kafka consumer cleaned up');
    }

    if (queueService) {
      await queueService.cleanup();
      logger.info('Queue service cleaned up');
    }

    if (emailService) {
      await emailService.cleanup();
      logger.info('Email service cleaned up');
    }

    if (smsService) {
      await smsService.cleanup();
      logger.info('SMS service cleaned up');
    }

    if (pushService) {
      await pushService.cleanup();
      logger.info('Push service cleaned up');
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

process.on('unhandledRejection', (reason: any, promise: any) => {
  logger.error('Unhandled rejection', { promise, reason });
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
    const server = app.listen(notificationConfig.port, notificationConfig.host, () => {
      logger.info(`📧 Notification Service running on ${notificationConfig.host}:${notificationConfig.port}`, {
        env: notificationConfig.env,
        port: notificationConfig.port,
        host: notificationConfig.host,
        nodeVersion: process.version,
        databaseUrl: notificationConfig.database.url.replace(/:[^:@]*@/, ':***@'), // Hide password
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error);
      process.exit(1);
    });

    // Log startup completion
    logger.info('Notification Service startup completed successfully', {
      env: notificationConfig.env,
      port: notificationConfig.port,
      nodeVersion: process.version,
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        circuitBreaker: true,
        emailNotifications: config.features.email,
        smsNotifications: config.features.sms,
        pushNotifications: config.features.push,
        queueProcessing: config.features.queue,
        templateEngine: true,
        preferencesManagement: true,
        deliveryTracking: true,
        retryMechanism: true,
        bulkNotifications: true,
      },
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start Notification Service', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
