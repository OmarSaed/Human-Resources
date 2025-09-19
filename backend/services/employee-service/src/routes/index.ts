import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmployeeController } from '../controllers/employee.controller';
import { DepartmentController } from '../controllers/department.controller';
import { PositionController } from '../controllers/position.controller';
import { EmployeeService } from '../services/employee.service';
import { DepartmentService } from '../services/department.service';
import { PositionService } from '../services/position.service';
import { AuditService, NotificationService } from '@hrms/shared';
import { createEmployeeRoutes } from './employee.routes';
import { createDepartmentRoutes } from './department.routes';
import { createPositionRoutes } from './position.routes';

export function createRoutes(prismaClient: PrismaClient): Router {
  const router = Router();

  // Initialize services
  const auditService = new AuditService('employee-service');
  const notificationService = new NotificationService('employee-service');
  
  const employeeService = new EmployeeService(prismaClient, auditService, notificationService);
  const departmentService = new DepartmentService(prismaClient, auditService, notificationService);
  const positionService = new PositionService(prismaClient, auditService, notificationService);
  
  // Initialize controllers
  const employeeController = new EmployeeController(employeeService);
  const departmentController = new DepartmentController(departmentService);
  const positionController = new PositionController(positionService);

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    (res as any).json({
      status: 'healthy',
      service: 'employee-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connected',
      modules: ['employees', 'departments', 'positions'],
    });
  });

  // Service info endpoint
  router.get('/info', (req: Request, res: Response) => {
    (res as any).json({
      service: 'Employee Management Service',
      version: '1.0.0',
      description: 'Handles employee, department, and position management',
      endpoints: {
        employees: '/api/v1/employees',
        departments: '/api/v1/departments',
        positions: '/api/v1/positions',
      },
      status: 'operational',
    });
  });

  // API v1 routes
  router.use('/api/v1/employees', createEmployeeRoutes(employeeController));
  router.use('/api/v1/departments', createDepartmentRoutes(departmentController));
  router.use('/api/v1/positions', createPositionRoutes(positionController));

  // Legacy endpoints for backwards compatibility
  router.get('/employees', (req: Request, res: Response) => {
    (res as any).redirect(301, '/api/v1/employees');
  });

  router.get('/departments', (req: Request, res: Response) => {
    (res as any).redirect(301, '/api/v1/departments');
  });

  router.get('/positions', (req: Request, res: Response) => {
    (res as any).redirect(301, '/api/v1/positions');
  });

  return router;
}