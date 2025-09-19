import express from 'express';
import { DevelopmentPlanController } from '../controllers/development-plan.controller';
import { authMiddleware, requirePermission, validateDevelopmentPlanCreate, validateDevelopmentPlanUpdate } from '../middleware';

export function createDevelopmentPlanRoutes(developmentPlanController: DevelopmentPlanController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Development Plan CRUD operations
  router.post(
    '/',
    requirePermission('development_plan.create'),
    validateDevelopmentPlanCreate,
    developmentPlanController.createDevelopmentPlan
  );

  router.get(
    '/statistics',
    developmentPlanController.getDevelopmentPlanStatistics
  );

  router.get(
    '/team-overview',
    requirePermission('development_plan.view_team'),
    developmentPlanController.getTeamDevelopmentPlansOverview
  );

  router.get(
    '/',
    developmentPlanController.listDevelopmentPlans
  );

  router.get(
    '/:id',
    developmentPlanController.getDevelopmentPlan
  );

  router.put(
    '/:id',
    requirePermission('development_plan.update'),
    validateDevelopmentPlanUpdate,
    developmentPlanController.updateDevelopmentPlan
  );

  router.delete(
    '/:id',
    requirePermission('development_plan.delete'),
    developmentPlanController.deleteDevelopmentPlan
  );

  // Development Plan progress
  router.put(
    '/:id/progress',
    developmentPlanController.updatePlanProgress
  );

  // Activities management
  router.post(
    '/:id/activities',
    requirePermission('development_plan.manage_activities'),
    developmentPlanController.addActivity
  );

  router.put(
    '/:id/activities/:activityId',
    requirePermission('development_plan.manage_activities'),
    developmentPlanController.updateActivity
  );

  router.post(
    '/:id/activities/:activityId/complete',
    developmentPlanController.completeActivity
  );

  return router;
}
