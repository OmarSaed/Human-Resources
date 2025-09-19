import { Router } from 'express';
import { PositionController } from '../controllers/position.controller';
import { validatePositionCreate, validatePositionUpdate } from '../validation/position.validation';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

export function createPositionRoutes(positionController: PositionController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Position CRUD operations
  router.post(
    '/',
    requirePermission(['positions.create']),
    validatePositionCreate,
    positionController.createPosition
  );

  router.get(
    '/',
    requirePermission(['positions.read']),
    positionController.getAllPositions
  );

  router.get(
    '/open',
    requirePermission(['positions.read']),
    positionController.getOpenPositions
  );

  router.get(
    '/hierarchy',
    requirePermission(['positions.read']),
    positionController.getPositionHierarchy
  );

  router.get(
    '/department/:departmentId',
    requirePermission(['positions.read']),
    positionController.getPositionsByDepartment
  );

  router.get(
    '/:id',
    requirePermission(['positions.read']),
    positionController.getPositionById
  );

  router.get(
    '/:id/stats',
    requirePermission(['positions.analytics']),
    positionController.getPositionStats
  );

  router.put(
    '/:id',
    requirePermission(['positions.update']),
    validatePositionUpdate,
    positionController.updatePosition
  );

  router.delete(
    '/:id',
    requirePermission(['positions.delete']),
    positionController.deletePosition
  );

  return router;
}
