import express from 'express';
import { CourseController } from '../controllers/course.controller';
import { CourseService } from '../services/course.service';
import { authMiddleware, validateCourseCreate, validateCourseUpdate, requirePermission } from '../middleware';

export function createCourseRoutes(courseService: CourseService): express.Router {
  const router = express.Router();
  const courseController = new CourseController(courseService);

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Course CRUD operations
  router.post(
    '/',
    requirePermission('course.create'),
    validateCourseCreate,
    courseController.createCourse
  );

  router.get(
    '/search',
    courseController.searchCourses
  );

  router.get(
    '/categories',
    courseController.getCourseCategories
  );

  router.get(
    '/popular',
    courseController.getPopularCourses
  );

  router.get(
    '/recommended',
    courseController.getRecommendedCourses
  );

  router.get(
    '/',
    courseController.listCourses
  );

  router.get(
    '/:id',
    courseController.getCourse
  );

  router.put(
    '/:id',
    requirePermission('course.update'),
    validateCourseUpdate,
    courseController.updateCourse
  );

  router.delete(
    '/:id',
    requirePermission('course.delete'),
    courseController.deleteCourse
  );

  // Course enrollment
  router.post(
    '/:id/enroll',
    courseController.enrollInCourse
  );

  router.delete(
    '/:id/enroll',
    courseController.unenrollFromCourse
  );

  router.get(
    '/:id/enrollments',
    requirePermission('course.view_enrollments'),
    courseController.getCourseEnrollments
  );

  // Course content management
  router.get(
    '/:id/content',
    courseController.getCourseContent
  );

  router.post(
    '/:id/content',
    requirePermission('course.manage_content'),
    courseController.addCourseContent
  );

  router.put(
    '/:id/content/:contentId',
    requirePermission('course.manage_content'),
    courseController.updateCourseContent
  );

  router.delete(
    '/:id/content/:contentId',
    requirePermission('course.manage_content'),
    courseController.deleteCourseContent
  );

  // Course publishing
  router.post(
    '/:id/publish',
    requirePermission('course.publish'),
    courseController.publishCourse
  );

  router.post(
    '/:id/unpublish',
    requirePermission('course.publish'),
    courseController.unpublishCourse
  );

  // Course ratings and reviews
  router.get(
    '/:id/reviews',
    courseController.getCourseReviews
  );

  router.post(
    '/:id/reviews',
    courseController.addCourseReview
  );

  router.put(
    '/:id/reviews/:reviewId',
    courseController.updateCourseReview
  );

  router.delete(
    '/:id/reviews/:reviewId',
    courseController.deleteCourseReview
  );

  return router;
}
