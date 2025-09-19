import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('health-routes');

export function createHealthRoutes(prismaClient: PrismaClient): Router {
  const router = Router();

  /**
   * Basic health check
   */
  router.get('/', async (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        service: 'employee-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  /**
   * Detailed health check including database
   */
  router.get('/detailed', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Check database connection
      await prismaClient.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - startTime;

      // Get basic stats
      const [employeeCount, departmentCount, positionCount] = await Promise.all([
        prismaClient.employee.count({ where: { deletedAt: null } }),
        prismaClient.department.count({ where: { deletedAt: null } }),
        prismaClient.position.count({ where: { deletedAt: null } }),
      ]);

      res.json({
        success: true,
        data: {
          status: 'healthy',
          service: 'employee-service',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: {
            status: 'connected',
            responseTime: `${dbResponseTime}ms`,
          },
          statistics: {
            employees: employeeCount,
            departments: departmentCount,
            positions: positionCount,
          },
          memory: process.memoryUsage(),
          node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch,
          },
        },
      });
    } catch (error) {
      logger.error('Health check failed', error as Error);
      
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          service: 'employee-service',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
        },
      });
    }
  });

  /**
   * Readiness check
   */
  router.get('/ready', async (req, res) => {
    try {
      // Check if service is ready to accept requests
      await prismaClient.$queryRaw`SELECT 1`;
      
      res.json({
        success: true,
        data: {
          status: 'ready',
          service: 'employee-service',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        data: {
          status: 'not ready',
          service: 'employee-service',
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
        },
      });
    }
  });

  /**
   * Liveness check
   */
  router.get('/live', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'alive',
        service: 'employee-service',
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
