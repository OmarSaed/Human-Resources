import express from 'express';
import { GoalController } from '../controllers/goal.controller';
import { authMiddleware, requirePermission, validateGoalCreate, validateGoalUpdate } from '../middleware';

export function createGoalRoutes(goalController: GoalController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Goal CRUD operations
  router.post(
    '/',
    requirePermission('goal.create'),
    validateGoalCreate,
    goalController.createGoal
  );

  router.get(
    '/statistics',
    goalController.getGoalStatistics
  );

  router.get(
    '/team-overview',
    requirePermission('goal.view_team'),
    goalController.getTeamGoalsOverview
  );

  router.get(
    '/',
    goalController.listGoals
  );

  router.get(
    '/:id',
    goalController.getGoal
  );

  router.put(
    '/:id',
    requirePermission('goal.update'),
    validateGoalUpdate,
    goalController.updateGoal
  );

  router.delete(
    '/:id',
    requirePermission('goal.delete'),
    goalController.deleteGoal
  );

  // Goal progress and completion
  router.put(
    '/:id/progress',
    goalController.updateGoalProgress
  );

  router.post(
    '/:id/complete',
    goalController.completeGoal
  );

  // Goal alignment
  router.post(
    '/:id/align',
    requirePermission('goal.align'),
    goalController.alignGoals
  );

  // Goal comments
  router.post(
    '/:id/comments',
    goalController.addGoalComment
  );

  router.get(
    '/:id/comments',
    goalController.getGoalComments
  );

  return router;
}
