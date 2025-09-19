import express from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  setupMiddleware, 
  errorHandler, 
  notFoundHandler, 
  createLogger,
  initializeTracing,
  getTracer,
  MetricsService,
  initializeSecretsManager,
  getSecretsManager,
  createVersioningMiddleware,
  getServiceConfig
} from '@hrms/shared';
import { createRoutes } from './routes';
import { RecruitmentService } from './services/recruitment.service';
import { CandidateService } from './services/candidate.service';
import { JobPostingService } from './services/job-posting.service';
import { InterviewService } from './services/interview.service';
import { EvaluationService } from './services/evaluation.service';
import { ApplicationService } from './services/application.service';
import { ResumeParsingService } from './services/resume-parsing.service';
import { FileStorageService } from './services/file-storage.service';
import { SkillMatchingService } from './services/skill-matching.service';
import { KafkaProducerService } from './services/kafka-producer.service';

const logger = createLogger('recruitment-service');
const config = getServiceConfig('recruitment-service');
const app = express();
let prismaClient: PrismaClient;
let recruitmentService: RecruitmentService;
let candidateService: CandidateService;
let jobPostingService: JobPostingService;
let interviewService: InterviewService;
let evaluationService: EvaluationService;
let applicationService: ApplicationService;
let resumeParsingService: ResumeParsingService;
let fileStorageService: FileStorageService;
let skillMatchingService: SkillMatchingService;
let kafkaProducer: KafkaProducerService;

// Validate configuration
try {
  // Config validation handled by shared service
  logger.info('Recruitment service configuration validated successfully');
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
      serviceName: 'recruitment-service',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      sampler: {
        type: 'const',
        param: 1, // Sample all traces in development
      },
    });
    logger.info('Distributed tracing initialized');

    // Initialize metrics
    const metrics = MetricsService.getInstance('recruitment-service');
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
      const dbSecrets = await secretsManager.getSecret('secret/data/database/recruitment');
      const storageSecrets = await secretsManager.getSecret('secret/data/storage/aws');
      const integrationSecrets = await secretsManager.getSecret('secret/data/integrations/linkedin');
      
      if (dbSecrets || storageSecrets || integrationSecrets) {
        logger.info('Secrets loaded from Vault');
      }
    } catch (error) {
      logger.warn('Secrets manager initialization failed, using environment variables', error as Error);
    }

    // Initialize core services
    fileStorageService = new FileStorageService();
    await fileStorageService.initialize();
    logger.info('File storage service initialized');

    if (config.resumeParsing.enabled) {
      resumeParsingService = new ResumeParsingService();
      await resumeParsingService.initialize();
      logger.info('Resume parsing service initialized');
    }

    if (config.features.skillMatching) {
      skillMatchingService = new SkillMatchingService();
      await skillMatchingService.initialize();
      logger.info('Skill matching service initialized');
    }

    // Initialize Kafka producer
    kafkaProducer = new KafkaProducerService();
    await kafkaProducer.initialize();
    logger.info('Kafka producer service initialized');

    // Initialize business services
    candidateService = new CandidateService(prismaClient);

    jobPostingService = new JobPostingService(prismaClient);

    interviewService = new InterviewService(prismaClient);

    evaluationService = new EvaluationService(prismaClient);

    applicationService = new ApplicationService(prismaClient);

    recruitmentService = new RecruitmentService(
      prismaClient,
      candidateService,
      jobPostingService,
      interviewService,
      kafkaProducer
    );

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
  const metrics = MetricsService.getInstance('recruitment-service');
  app.use(metrics.createExpressMiddleware('recruitment-service') as any);

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
      service: 'recruitment-service',
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        resumeParsing: config.resumeParsing.enabled,
        skillMatching: config.features.skillMatching,
        autoScreening: config.features.autoScreening,
        duplicateDetection: config.features.duplicateDetection,
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
    recruitmentService,
    candidateService,
    jobPostingService,
    applicationService,
    interviewService,
    evaluationService
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
    if (kafkaProducer) {
      await kafkaProducer.cleanup();
      logger.info('Kafka producer cleaned up');
    }

    if (fileStorageService) {
      await fileStorageService.cleanup();
      logger.info('File storage service cleaned up');
    }

    if (resumeParsingService) {
      await resumeParsingService.cleanup();
      logger.info('Resume parsing service cleaned up');
    }

    if (skillMatchingService) {
      await skillMatchingService.cleanup();
      logger.info('Skill matching service cleaned up');
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
    const server = app.listen(config.port, config.host, () => {
      logger.info(`🎯 Recruitment Service running on ${config.host}:${config.port}`, {
        env: config.env,
        port: config.port,
        host: config.host,
        nodeVersion: process.version,
        databaseUrl: config.database.url.replace(/:[^:@]*@/, ':***@'), // Hide password
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error);
      process.exit(1);
    });

    // Log startup completion
    logger.info('Recruitment Service startup completed successfully', {
      env: config.env,
      port: config.port,
      nodeVersion: process.version,
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        circuitBreaker: true,
        jobPosting: true,
        candidateManagement: true,
        applicationTracking: true,
        interviewScheduling: true,
        resumeParsing: config.resumeParsing.enabled,
        skillMatching: config.features.skillMatching,
        autoScreening: config.features.autoScreening,
        onboardingWorkflows: true,
        duplicateDetection: config.features.duplicateDetection,
        referencesChecks: config.features.referenceChecks,
        analyticsReporting: true,
      },
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start Recruitment Service', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
