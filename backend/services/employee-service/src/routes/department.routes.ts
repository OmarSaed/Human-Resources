import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { validateDepartmentCreate, validateDepartmentUpdate } from '../validation/department.validation';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

export function createDepartmentRoutes(departmentController: DepartmentController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Department CRUD operations
  router.post(
    '/',
    requirePermission(['departments.create']),
    validateDepartmentCreate,
    departmentController.createDepartment
  );

  router.get(
    '/',
    requirePermission(['departments.read']),
    departmentController.getAllDepartments
  );

  router.get(
    '/hierarchy',
    requirePermission(['departments.read']),
    departmentController.getDepartmentHierarchy
  );

  router.get(
    '/:id',
    requirePermission(['departments.read']),
    departmentController.getDepartmentById
  );

  router.get(
    '/:id/stats',
    requirePermission(['departments.analytics']),
    departmentController.getDepartmentStats
  );

  router.put(
    '/:id',
    requirePermission(['departments.update']),
    validateDepartmentUpdate,
    departmentController.updateDepartment
  );

  router.delete(
    '/:id',
    requirePermission(['departments.delete']),
    departmentController.deleteDepartment
  );

  return router;
}
