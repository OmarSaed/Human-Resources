import express from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createInterviewRoutes(interviewController: InterviewController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Interview scheduling and management
  router.post(
    '/',
    requirePermission('interview.create'),
    interviewController.scheduleInterview
  );

  router.get(
    '/analytics',
    requirePermission('interview.analytics'),
    interviewController.getInterviewAnalytics
  );

  router.get(
    '/interviewer/:interviewerId/schedule',
    interviewController.getInterviewerSchedule
  );

  router.get(
    '/interviewer/:interviewerId/availability',
    interviewController.checkAvailability
  );

  router.get(
    '/',
    interviewController.listInterviews
  );

  router.get(
    '/:id',
    interviewController.getInterview
  );

  router.put(
    '/:id',
    requirePermission('interview.update'),
    interviewController.updateInterview
  );

  // Interview status management
  router.post(
    '/:id/cancel',
    requirePermission('interview.update'),
    interviewController.cancelInterview
  );

  router.post(
    '/:id/reschedule',
    requirePermission('interview.update'),
    interviewController.rescheduleInterview
  );

  router.post(
    '/:id/no-show',
    requirePermission('interview.update'),
    interviewController.markNoShow
  );

  // Interview feedback
  router.post(
    '/:id/feedback',
    requirePermission('interview.feedback'),
    interviewController.submitFeedback
  );

  return router;
}
