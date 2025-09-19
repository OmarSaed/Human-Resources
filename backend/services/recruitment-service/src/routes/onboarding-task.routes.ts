import express from 'express';
import { OnboardingTaskController } from '../controllers/onboarding-task.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createOnboardingTaskRoutes(onboardingTaskController: OnboardingTaskController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Task CRUD operations
  router.post(
    '/',
    requirePermission('onboarding_task.create'),
    onboardingTaskController.createTask
  );

  router.get(
    '/',
    onboardingTaskController.listTasks
  );

  router.get(
    '/candidate/:candidateId',
    onboardingTaskController.getCandidateTasks
  );

  router.get(
    '/:id',
    onboardingTaskController.getTask
  );

  router.put(
    '/:id',
    onboardingTaskController.updateTask
  );

  router.delete(
    '/:id',
    requirePermission('onboarding_task.delete'),
    onboardingTaskController.deleteTask
  );

  // Task operations
  router.post(
    '/:id/complete',
    onboardingTaskController.completeTask
  );

  return router;
}