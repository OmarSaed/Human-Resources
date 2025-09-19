import express from 'express';
import { CompetencyAssessmentController } from '../controllers/competency-assessment.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createCompetencyAssessmentRoutes(competencyAssessmentController: CompetencyAssessmentController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Assessment CRUD operations
  router.post(
    '/',
    requirePermission('competency_assessment.create'),
    competencyAssessmentController.createAssessment
  );

  router.get(
    '/',
    competencyAssessmentController.listAssessments
  );

  router.get(
    '/:id',
    competencyAssessmentController.getAssessment
  );

  router.put(
    '/:id',
    competencyAssessmentController.updateAssessment
  );

  router.delete(
    '/:id',
    requirePermission('competency_assessment.delete'),
    competencyAssessmentController.deleteAssessment
  );

  // Assessment submission and approval
  router.post(
    '/:id/submit',
    competencyAssessmentController.submitAssessment
  );

  router.post(
    '/:id/approve',
    requirePermission('competency_assessment.approve'),
    competencyAssessmentController.approveAssessment
  );

  router.post(
    '/:id/reject',
    requirePermission('competency_assessment.approve'),
    competencyAssessmentController.rejectAssessment
  );

  // Self-assessment
  router.post(
    '/self-assessment',
    competencyAssessmentController.createSelfAssessment
  );

  // User assessments
  router.get(
    '/users/:targetUserId',
    competencyAssessmentController.getUserAssessments
  );

  router.get(
    '/users/:targetUserId/summary',
    competencyAssessmentController.getCompetencyScoresSummary
  );

  // Assessment analytics
  router.get(
    '/analytics/overview',
    requirePermission('competency_assessment.analytics'),
    competencyAssessmentController.getAssessmentAnalytics
  );

  // Assessment history
  router.get(
    '/:id/history',
    competencyAssessmentController.getAssessmentHistory
  );

  // Bulk operations
  router.post(
    '/bulk-create',
    requirePermission('competency_assessment.bulk_create'),
    competencyAssessmentController.bulkCreateAssessments
  );

  return router;
}
