import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { createLogger, errorHandler, notFoundHandler } from '@hrms/shared';
import { getServiceConfig, validateServiceConfig } from '@hrms/shared';
import { createRoutes } from './routes';

const logger = createLogger('employee-service');
const app = express();
let prismaClient: PrismaClient;

// Get service configuration from shared service
const employeeConfig = getServiceConfig('employee-service');

// Validate configuration
try {
  validateServiceConfig('employee-service');
  logger.info('Employee service configuration validated successfully');
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
 * Setup middleware
 */
function setupMiddleware(): void {
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
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-User-ID',
      'X-User-Email',
      'X-User-Role',
      'X-Session-ID',
    ],
  }));

  // Body parsing and compression
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (req as any).requestId = requestId;
    (req as any).startTime = Date.now();
    
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Service', 'employee-service');
    
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.headers['x-user-id'],
    });
    
    next();
  });

  // Response logging
  app.use((req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const responseTime = Date.now() - (req as any).startTime;
      
      logger.info('Outgoing response', {
        requestId: (req as any).requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.headers['x-user-id'],
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  });

  logger.info('Middleware setup completed');
}

/**
 * Setup routes
 */
function setupRoutes(): void {
  const routes = createRoutes(prismaClient);
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

    // Setup middleware
    setupMiddleware();

    // Setup routes
    setupRoutes();

    // Start HTTP server
    const server = app.listen(employeeConfig.port, employeeConfig.host, () => {
      logger.info(`🏢 Employee Service running on ${employeeConfig.host}:${employeeConfig.port}`, {
        env: process.env.NODE_ENV || 'development',
        port: employeeConfig.port,
        host: employeeConfig.host,
        nodeVersion: process.version,
        databaseUrl: employeeConfig.database.url.replace(/:[^:@]*@/, ':***@'), // Hide password
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error', error);
      process.exit(1);
    });

    // Log startup completion
    logger.info('Employee Service startup completed successfully', {
      features: [
        'Employee Management',
        'Department Management', 
        'Position Management',
        'Audit Logging',
        'Event-Driven Architecture',
        'Repository Pattern',
      ],
    });

    return server as any;
  } catch (error) {
    logger.error('Failed to start Employee Service', error as Error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
