import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { validateEmployeeCreate, validateEmployeeUpdate } from '../validation/employee.validation';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

export function createEmployeeRoutes(employeeController: EmployeeController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Employee CRUD operations
  router.post(
    '/',
    requirePermission(['employees.create']),
    validateEmployeeCreate,
    employeeController.createEmployee
  );

  router.get(
    '/search',
    requirePermission(['employees.read']),
    employeeController.searchEmployees
  );

  router.get(
    '/analytics',
    requirePermission(['employees.analytics']),
    employeeController.getEmployeeAnalytics
  );

  router.get(
    '/birthdays/upcoming',
    requirePermission(['employees.read']),
    employeeController.getUpcomingBirthdays
  );

  router.get(
    '/anniversaries/upcoming',
    requirePermission(['employees.read']),
    employeeController.getUpcomingAnniversaries
  );

  router.get(
    '/department/:departmentId',
    requirePermission(['employees.read']),
    employeeController.getEmployeesByDepartment
  );

  router.get(
    '/manager/:managerId',
    requirePermission(['employees.read']),
    employeeController.getEmployeesByManager
  );

  router.get(
    '/hierarchy/:managerId',
    requirePermission(['employees.read']),
    employeeController.getEmployeeHierarchy
  );

  router.get(
    '/number/:employeeNumber',
    requirePermission(['employees.read']),
    employeeController.getEmployeeByNumber
  );

  router.get(
    '/:id',
    requirePermission(['employees.read']),
    employeeController.getEmployeeById
  );

  router.put(
    '/:id',
    requirePermission(['employees.update']),
    validateEmployeeUpdate,
    employeeController.updateEmployee
  );

  router.delete(
    '/:id',
    requirePermission(['employees.delete']),
    employeeController.deleteEmployee
  );

  return router;
}
