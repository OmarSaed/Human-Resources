import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { CourseService } from '../services/course.service';

const logger = createLogger('course-controller');

export class CourseController {
  constructor(private courseService: CourseService) {}

  /**
   * Create a new course
   */
  createCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const courseData = req.body;

      const course = await this.courseService.createCourse({
        ...courseData,
        instructorId: userId,
      }, userId);

      logger.info('Course created successfully', {
        courseId: course.id,
        title: course.title,
        instructorId: userId,
      });

      res.status(201).json({
        success: true,
        course,
        message: 'Course created successfully',
      });
    } catch (error) {
      logger.error('Failed to create course', error as Error);
      res.status(500).json({
        error: 'Failed to create course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get course by ID
   */
  getCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const course = await this.courseService.getCourse(id, userId);

      if (!course) {
        res.status(404).json({
          error: 'Course not found',
          message: 'The requested course was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        course,
      });
    } catch (error) {
      logger.error('Failed to get course', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update course
   */
  updateCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const course = await this.courseService.updateCourse(id, updates, userId);

      logger.info('Course updated successfully', {
        courseId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        course,
        message: 'Course updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update course', error as Error);
      res.status(500).json({
        error: 'Failed to update course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete course
   */
  deleteCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.courseService.deleteCourse(id, userId);

      logger.info('Course deleted successfully', { courseId: id, userId });

      res.json({
        success: true,
        message: 'Course deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete course', error as Error);
      res.status(500).json({
        error: 'Failed to delete course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List courses
   */
  listCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        level,
        status,
        instructorId,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
      } = req.query;

      const options = {
        category: category as string,
        level: level as string,
        status: status as string,
        instructorId: instructorId as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
      };

      const result = await this.courseService.listCourses(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list courses', error as Error);
      res.status(500).json({
        error: 'Failed to list courses',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Search courses
   */
  searchCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        query,
        category,
        level,
        duration,
        skills,
        page = 1,
        limit = 20,
      } = req.query;

      const searchOptions = {
        query: query as string,
        category: category as string,
        level: level as string,
        duration: duration as string,
        skills: skills ? (skills as string).split(',') : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
      };

      const result = await this.courseService.searchCourses(searchOptions);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Course search failed', error as Error);
      res.status(500).json({
        error: 'Search failed',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get course categories
   */
  getCourseCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.courseService.getCourseCategories();

      res.json({
        success: true,
        categories,
      });
    } catch (error) {
      logger.error('Failed to get course categories', error as Error);
      res.status(500).json({
        error: 'Failed to get course categories',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get popular courses
   */
  getPopularCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 10, category, timeframe = '30d' } = req.query;

      const courses = await this.courseService.getPopularCourses({
        limit: parseInt(limit as string),
        category: category as string,
        timeframe: timeframe as string,
      });

      res.json({
        success: true,
        courses,
      });
    } catch (error) {
      logger.error('Failed to get popular courses', error as Error);
      res.status(500).json({
        error: 'Failed to get popular courses',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get recommended courses for user
   */
  getRecommendedCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { limit = 10, category } = req.query;

      const courses = await this.courseService.getRecommendedCourses(userId, {
        limit: parseInt(limit as string),
        category: category as string,
      });

      res.json({
        success: true,
        courses,
      });
    } catch (error) {
      logger.error('Failed to get recommended courses', error as Error);
      res.status(500).json({
        error: 'Failed to get recommended courses',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Enroll in course
   */
  enrollInCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const enrollment = await this.courseService.enrollInCourse(id, userId);

      logger.info('User enrolled in course', {
        courseId: id,
        userId,
        enrollmentId: enrollment.id,
      });

      res.status(201).json({
        success: true,
        enrollment,
        message: 'Successfully enrolled in course',
      });
    } catch (error) {
      logger.error('Failed to enroll in course', error as Error);
      res.status(500).json({
        error: 'Failed to enroll in course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Unenroll from course
   */
  unenrollFromCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.courseService.unenrollFromCourse(id, userId);

      logger.info('User unenrolled from course', { courseId: id, userId });

      res.json({
        success: true,
        message: 'Successfully unenrolled from course',
      });
    } catch (error) {
      logger.error('Failed to unenroll from course', error as Error);
      res.status(500).json({
        error: 'Failed to unenroll from course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get course enrollments
   */
  getCourseEnrollments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'enrolledAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        status: status as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.courseService.getCourseEnrollments(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get course enrollments', error as Error);
      res.status(500).json({
        error: 'Failed to get course enrollments',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get course content
   */
  getCourseContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const content = await this.courseService.getCourseContent(id, userId);

      res.json({
        success: true,
        content,
      });
    } catch (error) {
      logger.error('Failed to get course content', error as Error);
      res.status(500).json({
        error: 'Failed to get course content',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Add course content
   */
  addCourseContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const contentData = req.body;

      const content = await this.courseService.addCourseContent(id, contentData, userId);

      logger.info('Course content added', {
        courseId: id,
        contentId: content.id,
        type: content.type,
        userId,
      });

      res.status(201).json({
        success: true,
        content,
        message: 'Course content added successfully',
      });
    } catch (error) {
      logger.error('Failed to add course content', error as Error);
      res.status(500).json({
        error: 'Failed to add course content',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update course content
   */
  updateCourseContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, contentId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const content = await this.courseService.updateCourseContent(id, contentId, updates, userId);

      logger.info('Course content updated', {
        courseId: id,
        contentId,
        userId,
      });

      res.json({
        success: true,
        content,
        message: 'Course content updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update course content', error as Error);
      res.status(500).json({
        error: 'Failed to update course content',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete course content
   */
  deleteCourseContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, contentId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.courseService.deleteCourseContent(id, contentId, userId);

      logger.info('Course content deleted', {
        courseId: id,
        contentId,
        userId,
      });

      res.json({
        success: true,
        message: 'Course content deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete course content', error as Error);
      res.status(500).json({
        error: 'Failed to delete course content',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Publish course
   */
  publishCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.courseService.publishCourse(id, userId);

      logger.info('Course published', { courseId: id, userId });

      res.json({
        success: true,
        message: 'Course published successfully',
      });
    } catch (error) {
      logger.error('Failed to publish course', error as Error);
      res.status(500).json({
        error: 'Failed to publish course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Unpublish course
   */
  unpublishCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.courseService.unpublishCourse(id, userId);

      logger.info('Course unpublished', { courseId: id, userId });

      res.json({
        success: true,
        message: 'Course unpublished successfully',
      });
    } catch (error) {
      logger.error('Failed to unpublish course', error as Error);
      res.status(500).json({
        error: 'Failed to unpublish course',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get course reviews
   */
  getCourseReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.courseService.getCourseReviews(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get course reviews', error as Error);
      res.status(500).json({
        error: 'Failed to get course reviews',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Add course review
   */
  addCourseReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const reviewData = req.body;

      const review = await this.courseService.addCourseReview(id, userId, reviewData);

      logger.info('Course review added', {
        courseId: id,
        reviewId: review.id,
        rating: review.rating,
        userId,
      });

      res.status(201).json({
        success: true,
        review,
        message: 'Review added successfully',
      });
    } catch (error) {
      logger.error('Failed to add course review', error as Error);
      res.status(500).json({
        error: 'Failed to add course review',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update course review
   */
  updateCourseReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, reviewId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const review = await this.courseService.updateCourseReview(id, reviewId, userId, updates);

      logger.info('Course review updated', {
        courseId: id,
        reviewId,
        userId,
      });

      res.json({
        success: true,
        review,
        message: 'Review updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update course review', error as Error);
      res.status(500).json({
        error: 'Failed to update course review',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete course review
   */
  deleteCourseReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, reviewId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.courseService.deleteCourseReview(id, reviewId, userId);

      logger.info('Course review deleted', {
        courseId: id,
        reviewId,
        userId,
      });

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete course review', error as Error);
      res.status(500).json({
        error: 'Failed to delete course review',
        message: (error as Error).message,
      });
    }
  };
}
