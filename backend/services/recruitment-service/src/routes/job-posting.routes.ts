import express from 'express';
import { JobPostingController } from '../controllers/job-posting.controller';
import { authMiddleware, requirePermission, validateJobPostingCreate, validateJobPostingUpdate } from '../middleware';

export function createJobPostingRoutes(jobPostingController: JobPostingController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Job Posting CRUD operations
  router.post(
    '/',
    requirePermission('job_posting.create'),
    validateJobPostingCreate,
    jobPostingController.createJobPosting
  );

  router.get(
    '/search/public',
    jobPostingController.searchPublicJobs
  );

  router.get(
    '/analytics',
    requirePermission('job_posting.analytics'),
    jobPostingController.getJobAnalytics
  );

  router.get(
    '/',
    jobPostingController.listJobPostings
  );

  router.get(
    '/:id',
    jobPostingController.getJobPosting
  );

  router.put(
    '/:id',
    requirePermission('job_posting.update'),
    validateJobPostingUpdate,
    jobPostingController.updateJobPosting
  );

  router.delete(
    '/:id',
    requirePermission('job_posting.delete'),
    jobPostingController.deleteJobPosting
  );

  // Job Posting status management
  router.post(
    '/:id/publish',
    requirePermission('job_posting.publish'),
    jobPostingController.publishJobPosting
  );

  router.post(
    '/:id/pause',
    requirePermission('job_posting.publish'),
    jobPostingController.pauseJobPosting
  );

  // Job Posting operations
  router.get(
    '/:id/applications',
    requirePermission('job_posting.view_applications'),
    jobPostingController.getJobApplications
  );

  router.get(
    '/:id/statistics',
    requirePermission('job_posting.view_statistics'),
    jobPostingController.getJobStatistics
  );

  router.post(
    '/:id/clone',
    requirePermission('job_posting.create'),
    jobPostingController.cloneJobPosting
  );

  return router;
}
