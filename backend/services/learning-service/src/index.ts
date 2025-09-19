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
import { LearningService } from './services/learning.service';
import { CourseService } from './services/course.service';
import { ProgressService } from './services/progress.service';
import { CertificateService } from './services/certificate.service';
import { SkillService } from './services/skill.service';
import { AssessmentService } from './services/assessment.service';
import { ContentService } from './services/content.service';
import { AnalyticsService } from './services/analytics.service';
import { LearningPathService } from './services/learning-path.service';
import { KafkaProducerService } from './services/kafka-producer.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';

const logger = createLogger('learning-service');
const app = express();
let prismaClient: PrismaClient;
let learningService: LearningService;
let courseService: CourseService;
let progressService: ProgressService;
let certificateService: CertificateService;
let skillService: SkillService;
let assessmentService: AssessmentService;
let contentService: ContentService;
let analyticsService: AnalyticsService;
let learningPathService: LearningPathService;
let kafkaProducer: KafkaProducerService;
let kafkaConsumer: KafkaConsumerService;

// Get service configuration from shared service
const config = getServiceConfig('learning-service');
const learningConfig = config;

// Validate configuration
try {
  validateServiceConfig('learning-service');
  logger.info('Learning service configuration validated successfully');
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
      serviceName: 'learning-service',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      sampler: {
        type: 'const',
        param: 1, // Sample all traces in development
      },
    });
    logger.info('Distributed tracing initialized');

    // Initialize metrics
    const metrics = MetricsService.getInstance('learning-service');
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
      const dbSecrets = await secretsManager.getSecret('secret/data/database/learning');
      const storageSecrets = await secretsManager.getSecret('secret/data/storage/aws');
      const integrationSecrets = await secretsManager.getSecret('secret/data/integrations/video');
      
      if (dbSecrets || storageSecrets || integrationSecrets) {
        logger.info('Secrets loaded from Vault');
      }
    } catch (error) {
      logger.warn('Secrets manager initialization failed, using environment variables', error as Error);
    }

    // Initialize Kafka services
    kafkaProducer = new KafkaProducerService();
    await kafkaProducer.initialize();
    logger.info('Kafka producer service initialized');

    // Initialize core services
    contentService = new ContentService();
    await contentService.initialize();
    logger.info('Content service initialized');

    if (config.features.skillTracking) {
      skillService = new SkillService(prismaClient);
      logger.info('Skill service initialized');
    }

    assessmentService = new AssessmentService(prismaClient);
    logger.info('Assessment service initialized');

    progressService = new ProgressService(prismaClient);
    logger.info('Progress service initialized');

    if (config.features.certificates) {
      certificateService = new CertificateService(prismaClient);
      logger.info('Certificate service initialized');
    }

    courseService = new CourseService(prismaClient);
    logger.info('Course service initialized');

    if (config.analytics.enabled) {
      analyticsService = new AnalyticsService(prismaClient);
      logger.info('Analytics service initialized');
    }

    learningPathService = new LearningPathService(prismaClient);
    logger.info('Learning path service initialized');

    learningService = new LearningService(
      prismaClient,
      courseService,
      progressService,
      certificateService,
      skillService,
      analyticsService,
      kafkaProducer
    );
    logger.info('Learning service initialized');

    // Initialize Kafka consumer for employee events
    kafkaConsumer = new KafkaConsumerService(learningService);
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
  const metrics = MetricsService.getInstance('learning-service');
  app.use(metrics.createExpressMiddleware('learning-service') as any);

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
      service: 'learning-service',
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        videoProcessing: config.video.processing,
        certificates: config.features.certificates,
        skillTracking: config.features.skillTracking,
        learningPaths: config.features.learningPaths,
        analytics: config.analytics.enabled,
        socialLearning: config.features.socialLearning,
        gamification: config.features.gamification,
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
  const routes = createRoutes(
    prismaClient,
    learningService,
    courseService,
    progressService,
    certificateService,
    skillService,
    learningPathService,
    assessmentService,
    analyticsService
  );
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

    if (kafkaProducer) {
      await kafkaProducer.cleanup();
      logger.info('Kafka producer cleaned up');
    }

    if (contentService) {
      await contentService.cleanup();
      logger.info('Content service cleaned up');
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
    const server = app.listen(learningConfig.port, learningConfig.host, () => {
      logger.info(`📚 Learning & Development Service running on ${learningConfig.host}:${learningConfig.port}`, {
        env: learningConfig.env,
        port: learningConfig.port,
        host: learningConfig.host,
        nodeVersion: process.version,
        databaseUrl: learningConfig.database.url.replace(/:[^:@]*@/, ':***@'), // Hide password
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error);
      process.exit(1);
    });

    // Log startup completion
    logger.info('Learning & Development Service startup completed successfully', {
      env: learningConfig.env,
      port: learningConfig.port,
      nodeVersion: process.version,
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        circuitBreaker: true,
        courseManagement: true,
        contentDelivery: true,
        progressTracking: true,
        assessmentSystem: true,
        certificateGeneration: config.features.certificates,
        skillTracking: config.features.skillTracking,
        learningPaths: config.features.learningPaths,
        videoProcessing: config.video.processing,
        analyticsReporting: config.analytics.enabled,
        socialLearning: config.features.socialLearning,
        gamification: config.features.gamification,
        externalVideoIntegration: config.integrations.youtube.enabled || config.integrations.vimeo.enabled,
      },
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start Learning & Development Service', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
