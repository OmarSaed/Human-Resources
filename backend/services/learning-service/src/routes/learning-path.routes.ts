import express from 'express';
import { LearningPathController } from '../controllers/learning-path.controller';
import { authMiddleware, requirePermission, validateRequest } from '../middleware';

export function createLearningPathRoutes(learningPathController: LearningPathController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Learning path CRUD operations
  router.post(
    '/',
    requirePermission('learning_path.create'),
    validateRequest({
      body: {
        title: { type: 'string', required: true },
        description: { type: 'string', required: false },
        category: { type: 'string', required: true },
        level: { type: 'string', required: true, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
        estimatedDuration: { type: 'number', required: true },
        courseIds: { type: 'array', required: true },
        prerequisites: { type: 'array', required: false },
        skills: { type: 'array', required: false },
        isActive: { type: 'boolean', required: false },
        tags: { type: 'array', required: false },
      },
    }),
    learningPathController.createLearningPath
  );

  router.get(
    '/',
    learningPathController.listLearningPaths
  );

  router.get(
    '/:id',
    learningPathController.getLearningPath
  );

  router.put(
    '/:id',
    requirePermission('learning_path.update'),
    validateRequest({
      body: {
        title: { type: 'string', required: false },
        description: { type: 'string', required: false },
        category: { type: 'string', required: false },
        level: { type: 'string', required: false, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
        estimatedDuration: { type: 'number', required: false },
        courseIds: { type: 'array', required: false },
        prerequisites: { type: 'array', required: false },
        skills: { type: 'array', required: false },
        isActive: { type: 'boolean', required: false },
        tags: { type: 'array', required: false },
      },
    }),
    learningPathController.updateLearningPath
  );

  router.delete(
    '/:id',
    requirePermission('learning_path.delete'),
    learningPathController.deleteLearningPath
  );

  // Enrollment operations
  router.post(
    '/:id/enroll',
    validateRequest({
      body: {
        employeeId: { type: 'string', required: false }, // Optional, defaults to current user
      },
    }),
    learningPathController.enrollInPath
  );

  router.get(
    '/:id/enrollment',
    learningPathController.getPathEnrollment
  );

  router.put(
    '/:id/progress',
    validateRequest({
      body: {
        courseId: { type: 'string', required: true },
        completed: { type: 'boolean', required: true },
        employeeId: { type: 'string', required: false },
      },
    }),
    learningPathController.updateEnrollmentProgress
  );

  // Analytics and insights
  router.get(
    '/:id/analytics',
    requirePermission('learning_path.analytics'),
    learningPathController.getPathAnalytics
  );

  router.get(
    '/recommendations/for-me',
    learningPathController.getRecommendedPaths
  );

  // Learning path operations
  router.post(
    '/:id/clone',
    requirePermission('learning_path.clone'),
    validateRequest({
      body: {
        title: { type: 'string', required: true },
      },
    }),
    learningPathController.cloneLearningPath
  );

  return router;
}
