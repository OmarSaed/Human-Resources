import { Router } from 'express';
import { PerformanceReviewController } from '../controllers/performance-review.controller';
import { 
  validatePerformanceReviewCreate, 
  validatePerformanceReviewUpdate,
  validatePerformanceReviewQuery,
  validateReviewSubmission
} from '../validation/performance-review.validation';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

export function createPerformanceReviewRoutes(reviewController: PerformanceReviewController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Performance Review CRUD operations
  router.post(
    '/',
    requirePermission(['performance.reviews.create']),
    validatePerformanceReviewCreate,
    reviewController.createPerformanceReview
  );

  router.get(
    '/search',
    requirePermission(['performance.reviews.read']),
    validatePerformanceReviewQuery,
    reviewController.searchPerformanceReviews
  );

  router.get(
    '/due-soon',
    requirePermission(['performance.reviews.read']),
    validatePerformanceReviewQuery,
    reviewController.getReviewsDueSoon
  );

  router.get(
    '/overdue',
    requirePermission(['performance.reviews.read']),
    reviewController.getOverdueReviews
  );

  router.get(
    '/statistics',
    requirePermission(['performance.reviews.analytics']),
    validatePerformanceReviewQuery,
    reviewController.getReviewStatistics
  );

  router.get(
    '/employee/:employeeId',
    requirePermission(['performance.reviews.read']),
    reviewController.getReviewsByEmployee
  );

  router.get(
    '/reviewer/:reviewerId',
    requirePermission(['performance.reviews.read']),
    reviewController.getReviewsByReviewer
  );

  router.get(
    '/:id',
    requirePermission(['performance.reviews.read']),
    reviewController.getPerformanceReviewById
  );

  router.put(
    '/:id',
    requirePermission(['performance.reviews.update']),
    validatePerformanceReviewUpdate,
    reviewController.updatePerformanceReview
  );

  router.post(
    '/:id/submit',
    requirePermission(['performance.reviews.submit']),
    validateReviewSubmission,
    reviewController.submitReview
  );

  router.post(
    '/:id/approve',
    requirePermission(['performance.reviews.approve']),
    validateReviewSubmission,
    reviewController.approveReview
  );

  router.delete(
    '/:id',
    requirePermission(['performance.reviews.delete']),
    reviewController.deletePerformanceReview
  );

  return router;
}
