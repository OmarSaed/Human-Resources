import express from 'express';
import { ReviewFeedbackController } from '../controllers/review-feedback.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createReviewFeedbackRoutes(reviewFeedbackController: ReviewFeedbackController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Feedback CRUD operations
  router.post(
    '/',
    reviewFeedbackController.createFeedback
  );

  router.get(
    '/:id',
    reviewFeedbackController.getFeedback
  );

  router.put(
    '/:id',
    reviewFeedbackController.updateFeedback
  );

  router.delete(
    '/:id',
    reviewFeedbackController.deleteFeedback
  );

  // Review feedback operations
  router.get(
    '/reviews/:reviewId',
    reviewFeedbackController.getReviewFeedback
  );

  router.post(
    '/reviews/:reviewId/request',
    requirePermission('review_feedback.request'),
    reviewFeedbackController.requestFeedback
  );

  router.get(
    '/reviews/:reviewId/analytics',
    requirePermission('review_feedback.analytics'),
    reviewFeedbackController.getFeedbackAnalytics
  );

  // Feedback requests
  router.get(
    '/requests/pending',
    reviewFeedbackController.getPendingRequests
  );

  router.post(
    '/requests/:requestId/respond',
    reviewFeedbackController.submitFeedbackResponse
  );

  // User feedback operations
  router.get(
    '/users/:targetUserId/summary',
    reviewFeedbackController.getUserFeedbackSummary
  );

  // Feedback management
  router.post(
    '/:id/anonymize',
    reviewFeedbackController.anonymizeFeedback
  );

  // Bulk operations
  router.post(
    '/bulk-request',
    requirePermission('review_feedback.bulk_request'),
    reviewFeedbackController.bulkRequestFeedback
  );

  // Reports
  router.post(
    '/generate-report',
    requirePermission('review_feedback.report'),
    reviewFeedbackController.generateFeedbackReport
  );

  return router;
}
