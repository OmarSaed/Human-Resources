import express from 'express';
import { AssessmentController } from '../controllers/assessment.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createAssessmentRoutes(assessmentController: AssessmentController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Assessment CRUD operations
  router.post(
    '/',
    requirePermission('assessment.create'),
    assessmentController.createAssessment
  );

  router.get(
    '/',
    assessmentController.listAssessments
  );

  router.get(
    '/:id',
    assessmentController.getAssessment
  );

  router.put(
    '/:id',
    requirePermission('assessment.update'),
    assessmentController.updateAssessment
  );

  router.delete(
    '/:id',
    requirePermission('assessment.delete'),
    assessmentController.deleteAssessment
  );

  // Assessment publishing
  router.post(
    '/:id/publish',
    requirePermission('assessment.publish'),
    assessmentController.publishAssessment
  );

  router.get(
    '/:id/preview',
    requirePermission('assessment.preview'),
    assessmentController.previewAssessment
  );

  // Assessment attempts
  router.post(
    '/:id/attempts',
    assessmentController.startAttempt
  );

  router.get(
    '/:id/attempts',
    assessmentController.getAssessmentAttempts
  );

  router.post(
    '/:id/attempts/:attemptId/submit',
    assessmentController.submitAttempt
  );

  router.get(
    '/attempts/:attemptId',
    assessmentController.getAttemptDetails
  );

  // Assessment grading
  router.post(
    '/attempts/:attemptId/grade',
    requirePermission('assessment.grade'),
    assessmentController.gradeAssessment
  );

  // Assessment analytics
  router.get(
    '/:id/analytics',
    requirePermission('assessment.analytics'),
    assessmentController.getAssessmentAnalytics
  );

  return router;
}
