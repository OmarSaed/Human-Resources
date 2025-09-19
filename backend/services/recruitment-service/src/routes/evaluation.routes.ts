import express from 'express';
import { EvaluationController } from '../controllers/evaluation.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createEvaluationRoutes(evaluationController: EvaluationController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Evaluation CRUD operations
  router.post(
    '/',
    requirePermission('evaluation.create'),
    evaluationController.createEvaluation
  );

  router.get(
    '/',
    evaluationController.listEvaluations
  );

  router.get(
    '/:id',
    evaluationController.getEvaluation
  );

  router.put(
    '/:id',
    evaluationController.updateEvaluation
  );

  router.delete(
    '/:id',
    requirePermission('evaluation.delete'),
    evaluationController.deleteEvaluation
  );

  // Evaluation submission
  router.post(
    '/:id/submit',
    evaluationController.submitEvaluation
  );

  // Candidate evaluations
  router.get(
    '/candidates/:candidateId',
    evaluationController.getCandidateEvaluations
  );

  router.get(
    '/candidates/:candidateId/summary',
    evaluationController.getEvaluationSummary
  );

  // Analytics and comparisons
  router.get(
    '/analytics/overview',
    requirePermission('evaluation.analytics'),
    evaluationController.getEvaluationAnalytics
  );

  router.post(
    '/compare-candidates',
    requirePermission('evaluation.compare'),
    evaluationController.compareCandidateEvaluations
  );

  router.post(
    '/calculate-ranking',
    requirePermission('evaluation.ranking'),
    evaluationController.calculateCandidateRanking
  );

  // Bulk operations
  router.post(
    '/bulk-create',
    requirePermission('evaluation.bulk_create'),
    evaluationController.bulkCreateEvaluations
  );

  // Reports
  router.post(
    '/generate-report',
    requirePermission('evaluation.report'),
    evaluationController.generateEvaluationReport
  );

  return router;
}
