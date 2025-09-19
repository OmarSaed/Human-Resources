import express from 'express';
import { CompetencyFrameworkController } from '../controllers/competency-framework.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createCompetencyFrameworkRoutes(competencyFrameworkController: CompetencyFrameworkController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Framework CRUD operations
  router.post(
    '/',
    requirePermission('competency_framework.create'),
    competencyFrameworkController.createFramework
  );

  router.get(
    '/',
    competencyFrameworkController.listFrameworks
  );

  router.get(
    '/:id',
    competencyFrameworkController.getFramework
  );

  router.put(
    '/:id',
    requirePermission('competency_framework.update'),
    competencyFrameworkController.updateFramework
  );

  router.delete(
    '/:id',
    requirePermission('competency_framework.delete'),
    competencyFrameworkController.deleteFramework
  );

  // Framework competencies
  router.get(
    '/:id/competencies',
    competencyFrameworkController.getFrameworkCompetencies
  );

  router.post(
    '/:id/competencies',
    requirePermission('competency.create'),
    competencyFrameworkController.createCompetency
  );

  router.put(
    '/:id/competencies/:competencyId',
    requirePermission('competency.update'),
    competencyFrameworkController.updateCompetency
  );

  router.delete(
    '/:id/competencies/:competencyId',
    requirePermission('competency.delete'),
    competencyFrameworkController.deleteCompetency
  );

  // Framework assignments
  router.post(
    '/:id/assign-role',
    requirePermission('competency_framework.assign'),
    competencyFrameworkController.assignFrameworkToRole
  );

  // Framework analytics
  router.get(
    '/:id/analytics',
    requirePermission('competency_framework.analytics'),
    competencyFrameworkController.getFrameworkAnalytics
  );

  // Framework operations
  router.post(
    '/:id/clone',
    requirePermission('competency_framework.clone'),
    competencyFrameworkController.cloneFramework
  );

  router.get(
    '/:id/export',
    requirePermission('competency_framework.export'),
    competencyFrameworkController.exportFramework
  );

  return router;
}
