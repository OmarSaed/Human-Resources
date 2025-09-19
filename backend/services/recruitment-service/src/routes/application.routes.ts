import express from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { authMiddleware, requirePermission, rateLimit } from '../middleware';

export function createApplicationRoutes(applicationController: ApplicationController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Application CRUD operations
  router.post(
    '/',
    requirePermission('application.create'),
    applicationController.createApplication
  );

  router.get(
    '/analytics',
    requirePermission('application.analytics'),
    applicationController.getApplicationAnalytics
  );

  router.get(
    '/',
    applicationController.listApplications
  );

  router.get(
    '/candidate/:candidateId',
    applicationController.getCandidateApplications
  );

  router.get(
    '/job/:jobPostingId',
    applicationController.getJobPostingApplications
  );

  router.get(
    '/:id',
    applicationController.getApplication
  );

  router.put(
    '/:id',
    requirePermission('application.update'),
    applicationController.updateApplication
  );

  router.delete(
    '/:id',
    requirePermission('application.delete'),
    applicationController.deleteApplication
  );

  return router;
}