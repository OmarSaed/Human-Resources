import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import {
  CourseData,
  CourseContent,
  CourseReview,
  CourseEnrollment,
  ListCoursesOptions,
  SearchCoursesOptions
} from '../models/course.models';

const logger = createLogger('course-service');


export class CourseService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new course
   */
  async createCourse(data: CourseData, authorId: string): Promise<any> {
    try {
      const course = await this.prisma.course.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category as any,
          difficulty: data.level as any || 'BEGINNER',
          duration: data.duration,
          estimatedHours: data.duration, // Convert duration to estimated hours
          language: data.language || 'en',
          instructorId: data.instructorId,
          authorId: authorId,
          thumbnailUrl: data.thumbnailUrl,
          learningObjectives: data.objectives || [],
          prerequisites: data.prerequisites || [],
          syllabus: {}, // Initialize with empty syllabus
          tags: data.tags || [],
          price: data.price || 0,
          currency: data.currency || 'USD',
          isPublic: data.isPublic || false,
          maxEnrollments: data.maxEnrollments,
          status: 'DRAFT',
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
        },
      });

      logger.info('Course created successfully', {
        courseId: course.id,
        title: course.title,
        instructorId: data.instructorId,
      });

      return course;
    } catch (error) {
      logger.error('Failed to create course', error as Error);
      throw error;
    }
  }

  /**
   * Get course by ID
   */
  async getCourse(courseId: string, userId?: string): Promise<any | null> {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
              bio: true,
              // avatar: true, // Avatar field not in current User schema
            },
          },
          content: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              order: true,
              duration: true,
              isRequired: true,
              isPreview: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
        },
      });

      if (!course) {
        return null;
      }

      // Check if user is enrolled
      let enrollment = null;
      if (userId) {
        enrollment = await this.prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
        });
      }

      // Calculate average rating
      const reviewStats = await this.prisma.review.aggregate({
        where: { courseId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      return {
        ...course,
        enrollment,
        averageRating: reviewStats._avg.rating || 0,
        reviewCount: reviewStats._count.rating,
      };
    } catch (error) {
      logger.error('Failed to get course', error as Error);
      throw error;
    }
  }

  /**
   * Update course
   */
  async updateCourse(courseId: string, updates: Partial<CourseData>, userId: string): Promise<any> {
    try {
      // Check if user has permission to update the course
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.instructorId !== userId) {
        throw new Error('You do not have permission to update this course');
      }

      // Convert category string to enum if needed
      const updateData: any = { ...updates };
      if (updateData.category && typeof updateData.category === 'string') {
        updateData.category = updateData.category as any;
      }
      
      const updatedCourse = await this.prisma.course.update({
        where: { id: courseId },
        data: updateData,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
        },
      });

      logger.info('Course updated successfully', {
        courseId,
        userId,
        updates: Object.keys(updates),
      });

      return updatedCourse;
    } catch (error) {
      logger.error('Failed to update course', error as Error);
      throw error;
    }
  }

  /**
   * Delete course
   */
  async deleteCourse(courseId: string, userId: string): Promise<void> {
    try {
      // Check if user has permission to delete the course
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.instructorId !== userId) {
        throw new Error('You do not have permission to delete this course');
      }

      // Check if course has enrollments
      const enrollmentCount = await this.prisma.enrollment.count({
        where: { courseId },
      });

      if (enrollmentCount > 0) {
        throw new Error('Cannot delete course with active enrollments');
      }

      await this.prisma.course.delete({
        where: { id: courseId },
      });

      logger.info('Course deleted successfully', { courseId, userId });
    } catch (error) {
      logger.error('Failed to delete course', error as Error);
      throw error;
    }
  }

  /**
   * List courses with filtering and pagination
   */
  async listCourses(options: ListCoursesOptions): Promise<{
    courses: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        category,
        level,
        status,
        instructorId,
        page,
        limit,
        sortBy,
        sortOrder,
        search,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (category) where.category = category;
      if (level) where.level = level;
      if (status) where.status = status;
      if (instructorId) where.instructorId = instructorId;

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ];
      }

      const [courses, total] = await Promise.all([
        this.prisma.course.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                reviews: true,
              },
            },
          },
        }),
        this.prisma.course.count({ where }),
      ]);

      // Add average ratings
      const coursesWithRatings = await Promise.all(
        courses.map(async (course) => {
          const reviewStats = await this.prisma.review.aggregate({
            where: { courseId: course.id },
            _avg: { rating: true },
          });

          return {
            ...course,
            averageRating: reviewStats._avg.rating || 0,
          };
        })
      );

      const totalPages = Math.ceil(total / limit);

      return {
        courses: coursesWithRatings,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list courses', error as Error);
      throw error;
    }
  }

  /**
   * Search courses
   */
  async searchCourses(options: SearchCoursesOptions): Promise<{
    courses: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { query, category, level, duration, skills, page, limit } = options;
      const skip = (page - 1) * limit;

      const where: any = {
        status: 'PUBLISHED',
        isPublic: true,
      };

      // Text search
      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ];
      }

      // Filters
      if (category) where.category = category;
      if (level) where.level = level;
      if (duration) {
        const [min, max] = duration.split('-').map(Number);
        where.duration = { gte: min, lte: max || 999 };
      }
      if (skills && skills.length > 0) {
        where.tags = { hasSome: skills };
      }

      const [courses, total] = await Promise.all([
        this.prisma.course.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                reviews: true,
              },
            },
          },
        }),
        this.prisma.course.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        courses,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to search courses', error as Error);
      throw error;
    }
  }

  /**
   * Get course categories
   */
  async getCourseCategories(): Promise<{ category: string; count: number }[]> {
    try {
      const categories = await this.prisma.course.groupBy({
        by: ['category'],
        _count: { category: true },
        where: { status: 'PUBLISHED' },
        orderBy: { _count: { category: 'desc' } },
      });

      return categories.map((cat) => ({
        category: cat.category,
        count: cat._count.category,
      }));
    } catch (error) {
      logger.error('Failed to get course categories', error as Error);
      throw error;
    }
  }

  /**
   * Get popular courses
   */
  async getPopularCourses(options: {
    limit: number;
    category?: string;
    timeframe: string;
  }): Promise<any[]> {
    try {
      const { limit, category, timeframe } = options;

      // Calculate date range based on timeframe
      const now = new Date();
      const timeframeMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };
      const days = timeframeMap[timeframe] || 30;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const where: any = {
        status: 'PUBLISHED',
        isPublic: true,
      };

      if (category) where.category = category;

      const courses = await this.prisma.course.findMany({
        where,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          enrollments: {
            where: {
              enrolledAt: { gte: startDate },
            },
            select: { id: true },
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
        },
        orderBy: {
          enrollments: {
            _count: 'desc',
          },
        },
        take: limit,
      });

      return courses.map((course) => ({
        ...course,
        recentEnrollments: course.enrollments.length,
        enrollments: course._count.enrollments,
      }));
    } catch (error) {
      logger.error('Failed to get popular courses', error as Error);
      throw error;
    }
  }

  /**
   * Get recommended courses for user
   */
  async getRecommendedCourses(
    userId: string,
    options: { limit: number; category?: string }
  ): Promise<any[]> {
    try {
      const { limit, category } = options;

      // Get user's enrolled courses and interests
      const userEnrollments = await this.prisma.enrollment.findMany({
        where: { userId },
        include: { course: true },
      });

      const enrolledCourseIds = userEnrollments.map((e) => e.courseId);
      const userCategories = [...new Set(userEnrollments.map((e) => e.course.category))];

      const where: any = {
        status: 'PUBLISHED',
        isPublic: true,
        id: { notIn: enrolledCourseIds },
      };

      if (category) {
        where.category = category;
      } else if (userCategories.length > 0) {
        where.category = { in: userCategories };
      }

      const courses = await this.prisma.course.findMany({
        where,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
        },
        orderBy: [
          { enrollments: { _count: 'desc' } },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      return courses;
    } catch (error) {
      logger.error('Failed to get recommended courses', error as Error);
      throw error;
    }
  }

  /**
   * Enroll user in course
   */
  async enrollInCourse(courseId: string, userId: string): Promise<CourseEnrollment> {
    try {
      // Check if course exists and is available
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.status !== 'PUBLISHED') {
        throw new Error('Course is not available for enrollment');
      }

      // Check if already enrolled
      const existingEnrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error('Already enrolled in this course');
      }

      // Check enrollment limits
      if (course.maxEnrollments) {
        const currentEnrollments = await this.prisma.enrollment.count({
          where: { courseId, status: 'IN_PROGRESS' as any },
        });

        if (currentEnrollments >= course.maxEnrollments) {
          throw new Error('Course is full');
        }
      }

      const enrollment = await this.prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: 'IN_PROGRESS' as any,
          progress: 0,
        },
      });

      logger.info('User enrolled in course', {
        userId,
        courseId,
        enrollmentId: enrollment.id,
      });

      return enrollment as CourseEnrollment;
    } catch (error) {
      logger.error('Failed to enroll in course', error as Error);
      throw error;
    }
  }

  /**
   * Unenroll user from course
   */
  async unenrollFromCourse(courseId: string, userId: string): Promise<void> {
    try {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (!enrollment) {
        throw new Error('Not enrolled in this course');
      }

      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'DROPPED' },
      });

      logger.info('User unenrolled from course', { userId, courseId });
    } catch (error) {
      logger.error('Failed to unenroll from course', error as Error);
      throw error;
    }
  }

  /**
   * Get course enrollments
   */
  async getCourseEnrollments(
    courseId: string,
    options: {
      status?: string;
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    }
  ): Promise<{
    enrollments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { status, page, limit, sortBy, sortOrder } = options;
      const skip = (page - 1) * limit;

      const where: any = { courseId };
      if (status) where.status = status;

      const [enrollments, total] = await Promise.all([
        this.prisma.enrollment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            userId: true,
            status: true,
            progress: true,
            enrolledAt: true,
            startedAt: true,
            completedAt: true,
          },
        }),
        this.prisma.enrollment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        enrollments,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to get course enrollments', error as Error);
      throw error;
    }
  }

  /**
   * Get course content
   */
  async getCourseContent(courseId: string, userId: string): Promise<CourseContent[]> {
    try {
      // Check if user has access to the course
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      // Check access permissions
      const hasAccess = enrollment || course.instructorId === userId || course.isPublic;

      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const content = await this.prisma.courseContent.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
      });

      // Filter content based on access level
      return content.map((item) => {
        if (!enrollment && course.instructorId !== userId) {
          // Non-enrolled users can only see preview content
          if (!item.isPreview) {
            return {
              ...item,
              contentUrl: undefined,
              content: undefined,
            };
          }
        }
        return item;
      }) as CourseContent[];
    } catch (error) {
      logger.error('Failed to get course content', error as Error);
      throw error;
    }
  }

  /**
   * Add course content
   */
  async addCourseContent(
    courseId: string,
    contentData: Omit<CourseContent, 'id'>,
    userId: string
  ): Promise<CourseContent> {
    try {
      // Check if user has permission to add content
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.instructorId !== userId) {
        throw new Error('You do not have permission to add content to this course');
      }

      const content = await this.prisma.courseContent.create({
        data: {
          ...contentData,
          content: contentData.content as any,
          courseId,
        },
      });

      logger.info('Course content added', {
        courseId,
        contentId: content.id,
        type: content.type,
        userId,
      });

      return {
        ...content,
        isPreview: content.isPreview || false,
      } as CourseContent;
    } catch (error) {
      logger.error('Failed to add course content', error as Error);
      throw error;
    }
  }

  /**
   * Update course content
   */
  async updateCourseContent(
    courseId: string,
    contentId: string,
    updates: Partial<CourseContent>,
    userId: string
  ): Promise<CourseContent> {
    try {
      // Check permissions
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.instructorId !== userId) {
        throw new Error('You do not have permission to update this content');
      }

      const content = await this.prisma.courseContent.update({
        where: { id: contentId },
        data: updates,
      });

      logger.info('Course content updated', { courseId, contentId, userId });

      return {
        ...content,
        isPreview: content.isPreview || false,
      } as CourseContent;
    } catch (error) {
      logger.error('Failed to update course content', error as Error);
      throw error;
    }
  }

  /**
   * Delete course content
   */
  async deleteCourseContent(courseId: string, contentId: string, userId: string): Promise<void> {
    try {
      // Check permissions
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.instructorId !== userId) {
        throw new Error('You do not have permission to delete this content');
      }

      await this.prisma.courseContent.delete({
        where: { id: contentId },
      });

      logger.info('Course content deleted', { courseId, contentId, userId });
    } catch (error) {
      logger.error('Failed to delete course content', error as Error);
      throw error;
    }
  }

  /**
   * Publish course
   */
  async publishCourse(courseId: string, userId: string): Promise<void> {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          content: true,
        },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.instructorId !== userId) {
        throw new Error('You do not have permission to publish this course');
      }

      // Validate course before publishing
      if (!course.title || !course.description) {
        throw new Error('Course must have title and description');
      }

      if (course.content.length === 0) {
        throw new Error('Course must have at least one content item');
      }

      await this.prisma.course.update({
        where: { id: courseId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });

      logger.info('Course published', { courseId, userId });
    } catch (error) {
      logger.error('Failed to publish course', error as Error);
      throw error;
    }
  }

  /**
   * Unpublish course
   */
  async unpublishCourse(courseId: string, userId: string): Promise<void> {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (course.instructorId !== userId) {
        throw new Error('You do not have permission to unpublish this course');
      }

      await this.prisma.course.update({
        where: { id: courseId },
        data: { status: 'DRAFT' },
      });

      logger.info('Course unpublished', { courseId, userId });
    } catch (error) {
      logger.error('Failed to unpublish course', error as Error);
      throw error;
    }
  }

  /**
   * Get course reviews
   */
  async getCourseReviews(
    courseId: string,
    options: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    }
  ): Promise<{
    reviews: CourseReview[];
    total: number;
    page: number;
    totalPages: number;
    averageRating: number;
  }> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const skip = (page - 1) * limit;

      const [reviews, total, ratingStats] = await Promise.all([
        this.prisma.review.findMany({
          where: { courseId },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.review.count({ where: { courseId } }),
        this.prisma.review.aggregate({
          where: { courseId },
          _avg: { rating: true },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        reviews: reviews as CourseReview[],
        total,
        page,
        totalPages,
        averageRating: ratingStats._avg.rating || 0,
      };
    } catch (error) {
      logger.error('Failed to get course reviews', error as Error);
      throw error;
    }
  }

  /**
   * Add course review
   */
  async addCourseReview(
    courseId: string,
    userId: string,
    reviewData: { rating: number; comment?: string }
  ): Promise<CourseReview> {
    try {
      // Check if user is enrolled in the course
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (!enrollment) {
        throw new Error('You must be enrolled in the course to leave a review');
      }

      // Check if user already reviewed
      const existingReview = await this.prisma.review.findUnique({
        where: {
          courseId_userId: {
            courseId,
            userId,
          },
        },
      });

      if (existingReview) {
        throw new Error('You have already reviewed this course');
      }

      const review = await this.prisma.review.create({
        data: {
          userId,
          courseId,
          rating: reviewData.rating,
          comment: reviewData.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Course review added', {
        courseId,
        userId,
        reviewId: review.id,
        rating: review.rating,
      });

      return review as CourseReview;
    } catch (error) {
      logger.error('Failed to add course review', error as Error);
      throw error;
    }
  }

  /**
   * Update course review
   */
  async updateCourseReview(
    courseId: string,
    reviewId: string,
    userId: string,
    updates: { rating?: number; comment?: string }
  ): Promise<CourseReview> {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new Error('Review not found');
      }

      if (review.userId !== userId) {
        throw new Error('You can only update your own reviews');
      }

      const updatedReview = await this.prisma.review.update({
        where: { id: reviewId },
        data: updates,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Course review updated', { courseId, reviewId, userId });

      return updatedReview as CourseReview;
    } catch (error) {
      logger.error('Failed to update course review', error as Error);
      throw error;
    }
  }

  /**
   * Delete course review
   */
  async deleteCourseReview(courseId: string, reviewId: string, userId: string): Promise<void> {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new Error('Review not found');
      }

      if (review.userId !== userId) {
        throw new Error('You can only delete your own reviews');
      }

      await this.prisma.review.delete({
        where: { id: reviewId },
      });

      logger.info('Course review deleted', { courseId, reviewId, userId });
    } catch (error) {
      logger.error('Failed to delete course review', error as Error); 
      throw error;
    }
  }
}
