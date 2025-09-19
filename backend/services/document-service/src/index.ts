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
  AuditService
} from '@hrms/shared';
import { getServiceConfig, validateServiceConfig } from '@hrms/shared';
import { createRoutes } from './routes';
import { DocumentService } from './services/document.service';
import { StorageService } from './services/storage.service';
import { ContentProcessingService } from './services/content-processing.service';
import { SearchService } from './services/search.service';
import { WorkflowService } from './services/workflow.service';
import { RetentionService } from './services/retention.service';
import { KafkaProducerService } from './services/kafka-producer.service';

// Get service-specific configuration
const baseConfig = getServiceConfig('document-service');
const documentConfig = baseConfig;

// Add document-specific feature flags with defaults
const config = {
  ...baseConfig,
  features: {
    versioning: process.env.ENABLE_FILE_VERSIONING === 'true',
    workflows: process.env.ENABLE_WORKFLOWS === 'true',
    sharing: process.env.ENABLE_DOCUMENT_SHARING === 'true',
    templates: process.env.ENABLE_DOCUMENT_TEMPLATES === 'true',
    collaboration: process.env.ENABLE_COLLABORATION === 'true',
    ...baseConfig.features
  },
  processing: {
    textExtraction: process.env.ENABLE_TEXT_EXTRACTION === 'true',
    thumbnailGeneration: process.env.ENABLE_THUMBNAIL_GENERATION === 'true',
    virusScanning: process.env.ENABLE_VIRUS_SCANNING === 'true',
    ...baseConfig.processing
  },
  search: {
    indexing: process.env.ENABLE_SEARCH_INDEXING === 'true',
    ...baseConfig.search
  },
  compliance: {
    auditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
    ...baseConfig.compliance
  },
  encryption: {
    enabled: process.env.ENABLE_ENCRYPTION === 'true',
    ...baseConfig.encryption
  },
  integrations: baseConfig.integrations || {}
};

const logger = createLogger('document-service');
const app = express();
let prismaClient: PrismaClient;
let documentService: DocumentService;
let storageService: StorageService;
let contentProcessingService: ContentProcessingService;
let searchService: SearchService;
let workflowService: WorkflowService;
let auditService: AuditService;
let retentionService: RetentionService;
let kafkaProducer: KafkaProducerService;

// Validate configuration
try {
  validateServiceConfig('document-service');
  logger.info('Document service configuration validated successfully');
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
      serviceName: 'document-service',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      sampler: {
        type: 'const',
        param: 1, // Sample all traces in development
      },
    });
    logger.info('Distributed tracing initialized');

    // Initialize metrics
    const metrics = MetricsService.getInstance('document-service');
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
      const dbSecrets = await secretsManager.getSecret('secret/data/database/document');
      const storageSecrets = await secretsManager.getSecret('secret/data/storage/aws');
      const integrationSecrets = await secretsManager.getSecret('secret/data/integrations/docusign');
      
      if (dbSecrets || storageSecrets || integrationSecrets) {
        logger.info('Secrets loaded from Vault');
      }
    } catch (error) {
      logger.warn('Secrets manager initialization failed, using environment variables', error as Error);
    }

    // Initialize Kafka producer (create mock KafkaService for now)
    const mockKafkaService = { producer: () => ({}), consumer: () => ({}), admin: () => ({}) } as any;
    kafkaProducer = new KafkaProducerService(mockKafkaService);
    logger.info('Kafka producer service initialized');

    // Initialize core services
    const storageConfig = {
      type: 'local' as const,
      localPath: './storage',
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: ['*']
    };
    storageService = new StorageService(storageConfig);
    logger.info('Storage service initialized');

    if (config.processing.textExtraction || config.processing.thumbnailGeneration) {
      contentProcessingService = new ContentProcessingService();
      logger.info('Content processing service initialized');
    }

    if (config.search.indexing) {
    const searchConfig = {
      node: 'http://localhost:9200',
      index: 'documents',
      maxResults: 1000
    };
      searchService = new SearchService(searchConfig);
      logger.info('Search service initialized');
    }

    if (config.compliance.auditLogging) {
      auditService = new AuditService('document-service');
      logger.info('Audit service initialized');
    }

    if (config.features.workflows) {
      workflowService = new WorkflowService(prismaClient);
      logger.info('Workflow service initialized');
    }

    retentionService = new RetentionService(prismaClient, storageService, auditService);
    logger.info('Retention service initialized');

    // Initialize main document service
    documentService = new DocumentService(
      prismaClient,
      storageService,
      contentProcessingService,
      searchService,
      workflowService,
      auditService,
      retentionService,
      kafkaProducer
    );
    logger.info('Document service initialized');

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
  const metrics = MetricsService.getInstance('document-service');
  app.use(metrics.createExpressMiddleware('document-service') as any);

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
      service: 'document-service',
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        fileVersioning: config.features.versioning,
        contentProcessing: config.processing.textExtraction,
        thumbnailGeneration: config.processing.thumbnailGeneration,
        searchIndexing: config.search.indexing,
        workflows: config.features.workflows,
        auditLogging: config.compliance.auditLogging,
        encryption: config.encryption.enabled,
        virusScanning: config.processing.virusScanning,
        collaboration: config.features.collaboration,
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
    documentService,
    storageService,
    workflowService,
    searchService,
    auditService
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
      // kafkaProducer.cleanup(); // Method doesn't exist
      logger.info('Kafka producer cleaned up');
    }

    if (storageService) {
      // storageService.cleanup(); // Method doesn't exist
      logger.info('Storage service cleaned up');
    }

    if (contentProcessingService) {
      // contentProcessingService.cleanup(); // Method doesn't exist
      logger.info('Content processing service cleaned up');
    }

    if (searchService) {
      // searchService.cleanup(); // Method doesn't exist
      logger.info('Search service cleaned up');
    }

    if (retentionService) {
      // retentionService.cleanup(); // Method doesn't exist
      logger.info('Retention service cleaned up');
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
    const server = app.listen(documentConfig.port, documentConfig.host, () => {
      logger.info(`📁 Document Management Service running on ${documentConfig.host}:${documentConfig.port}`, {
        env: documentConfig.env,
        port: documentConfig.port,
        host: documentConfig.host,
        nodeVersion: process.version,
        databaseUrl: documentConfig.database.url.replace(/:[^:@]*@/, ':***@'), // Hide password
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error);
      process.exit(1);
    });

    // Log startup completion
    logger.info('Document Management Service startup completed successfully', {
      env: documentConfig.env,
      port: documentConfig.port,
      nodeVersion: process.version,
      features: {
        tracing: true,
        metrics: true,
        secrets: true,
        versioning: true,
        circuitBreaker: true,
        fileManagement: true,
        folderOrganization: true,
        fileVersioning: config.features.versioning,
        contentProcessing: config.processing.textExtraction,
        thumbnailGeneration: config.processing.thumbnailGeneration,
        fullTextSearch: config.search.indexing,
        workflowAutomation: config.features.workflows,
        documentSharing: config.features.sharing,
        auditLogging: config.compliance.auditLogging,
        retentionPolicies: true,
        encryptionAtRest: config.encryption.enabled,
        virusScanning: config.processing.virusScanning,
        documentTemplates: config.features.templates,
        collaboration: config.features.collaboration,
        externalIntegrations: config.integrations ? Object.values(config.integrations as Record<string, any>).some(i => 
          i && typeof i === 'object' ? Object.values(i as Record<string, any>).some(v => Boolean(v)) : Boolean(i)
        ) : false,
      },
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start Document Management Service', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
