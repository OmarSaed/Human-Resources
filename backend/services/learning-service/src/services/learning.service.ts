import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { CourseService } from './course.service';
import { ProgressService } from './progress.service';
import { CertificateService } from './certificate.service';
import { SkillService } from './skill.service';
import { AnalyticsService } from './analytics.service';
import { KafkaProducerService } from './kafka-producer.service';
import {
  LearningMetrics,
  UserLearningProfile,
  LearningRecommendation
} from '../models/learning.models';

const logger = createLogger('learning-service');


export class LearningService {
  constructor(
    private prisma: PrismaClient,
    private courseService: CourseService,
    private progressService: ProgressService,
    private certificateService?: CertificateService,
    private skillService?: SkillService,
    private analyticsService?: AnalyticsService,
    private kafkaProducer?: KafkaProducerService
  ) {}

  /**
   * Get comprehensive learning metrics
   */
  async getLearningMetrics(startDate?: Date, endDate?: Date): Promise<LearningMetrics> {
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    const [
      totalCourses,
      activeCourses,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalCertificates,
      skillsTracked,
      courseRatings,
      totalLearningTime
    ] = await Promise.all([
      this.prisma.course.count({ where: dateFilter }),
      this.prisma.course.count({ where: { ...dateFilter, status: 'PUBLISHED' } }),
      this.prisma.enrollment.count({ where: dateFilter }),
      this.prisma.enrollment.count({ where: { ...dateFilter, status: { in: ['ENROLLED', 'IN_PROGRESS'] } } }),
      this.prisma.enrollment.count({ where: { ...dateFilter, status: 'COMPLETED' } }),
      this.certificateService ? 
        await this.prisma.certificate.count({ where: dateFilter }) : 0,
      this.skillService ? 
        await this.prisma.skill.count() : 0,
      this.prisma.courseReview.aggregate({
        _avg: { rating: true },
        where: dateFilter,
      }),
      this.prisma.enrollment.aggregate({
        _sum: { totalTimeSpent: true },
        where: dateFilter,
      }),
    ]);

    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const averageRating = courseRatings._avg.rating || 0;
    const learningHours = Math.round((totalLearningTime._sum.totalTimeSpent || 0) / 60);

    return {
      totalCourses,
      activeCourses,
      totalEnrollments,
      activeEnrollments,
      completionRate,
      averageRating,
      totalCertificates,
      skillsTracked,
      learningHours,
    };
  }

  /**
   * Get user learning profile
   */
  async getUserLearningProfile(userId: string): Promise<UserLearningProfile> {
    const [enrollments, certificates, skills, userProgress] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId },
        include: { course: true },
      }),
      this.certificateService ? 
        await this.prisma.certificate.count({ where: { userId } }) : 0,
      this.skillService ? 
        await this.prisma.employeeSkill.findMany({
          where: { userId },
          include: { skill: true },
        }) : [],
      this.prisma.enrollment.aggregate({
        where: { userId },
        _sum: { totalTimeSpent: true },
        _avg: { finalScore: true },
      }),
    ]);

    const totalEnrollments = enrollments.length;
    const inProgressEnrollments = enrollments.filter(e => e.status === 'IN_PROGRESS').length;
    const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED').length;
    const learningHours = Math.round((userProgress._sum.totalTimeSpent || 0) / 60);
    const averageScore = userProgress._avg.finalScore || 0;

    // Calculate learning streak (simplified)
    const recentActivities = await this.prisma.lessonProgress.findMany({
      where: { 
        enrollment: { userId },
        lastAccessedAt: { not: null },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: 30,
    });

    let streak = 0;
    if (recentActivities.length > 0) {
      // Simplified streak calculation - count consecutive days with activity
      const today = new Date();
      const activeDays = new Set();
      
      recentActivities.forEach(activity => {
        if (activity.lastAccessedAt) {
          const activityDate = activity.lastAccessedAt.toDateString();
          activeDays.add(activityDate);
        }
      });

      // Count streak from today backwards
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        if (activeDays.has(checkDate.toDateString())) {
          streak = i + 1;
        } else {
          break;
        }
      }
    }

    const lastActivity = recentActivities[0]?.lastAccessedAt || new Date();

    return {
      userId,
      enrollments: {
        total: totalEnrollments,
        inProgress: inProgressEnrollments,
        completed: completedEnrollments,
      },
      certificates: certificates as number,
      skills: skills as any[],
      learningHours,
      averageScore,
      streak,
      lastActivity,
    };
  }

  /**
   * Get learning recommendations for a user
   */
  async getLearningRecommendations(userId: string, limit = 10): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = [];

    try {
      // Get user's completed courses and skills
      const [userEnrollments, userSkills, userRole] = await Promise.all([
        this.prisma.enrollment.findMany({
          where: { userId, status: 'COMPLETED' },
          include: { course: true },
        }),
        this.skillService ? 
          await this.prisma.employeeSkill.findMany({
            where: { userId },
            include: { skill: true },
          }) : [],
        // This would ideally come from employee service
        Promise.resolve(null),
      ]);

      const completedCourseIds = userEnrollments.map(e => e.courseId);
      const userSkillCategories = userSkills.map((us: any) => us.skill.category);

      // Recommend courses based on completed course categories
      if (userEnrollments.length > 0) {
        const categories = [...new Set(userEnrollments.map(e => e.course.category))];
        
        const similarCourses = await this.prisma.course.findMany({
          where: {
            category: { in: categories as any[] },
            id: { notIn: completedCourseIds },
            status: 'PUBLISHED',
          },
          orderBy: { averageRating: 'desc' },
          take: 5,
        });

        similarCourses.forEach(course => {
          recommendations.push({
            type: 'course',
            id: course.id,
            title: course.title,
            reason: `Similar to courses you've completed in ${course.category}`,
            confidence: 0.8,
            estimatedHours: course.estimatedHours,
          });
        });
      }

      // Recommend skills based on role or popular skills
      if (this.skillService) {
        const popularSkills = await this.prisma.skill.findMany({
          where: {
            id: { notIn: userSkills.map((us: any) => us.skillId) },
          },
          take: 3,
        });

        popularSkills.forEach(skill => {
          recommendations.push({
            type: 'skill',
            id: skill.id,
            title: skill.name,
            reason: 'Popular skill in your field',
            confidence: 0.6,
            estimatedHours: 2, // Estimate for skill development
          });
        });
      }

      // Recommend highly rated courses for beginners if user has few completions
      if (userEnrollments.length < 3) {
        const beginnerCourses = await this.prisma.course.findMany({
          where: {
            difficulty: 'BEGINNER',
            status: 'PUBLISHED',
            id: { notIn: completedCourseIds },
            averageRating: { gte: 4.0 },
          },
          orderBy: { totalEnrollments: 'desc' },
          take: 3,
        });

        beginnerCourses.forEach(course => {
          recommendations.push({
            type: 'course',
            id: course.id,
            title: course.title,
            reason: 'Popular beginner course',
            confidence: 0.7,
            estimatedHours: course.estimatedHours,
          });
        });
      }

      // Sort by confidence and return top recommendations
      return recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error generating learning recommendations', {
        userId,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Enroll user in a course
   */
  async enrollUserInCourse(
    userId: string,
    courseId: string,
    assignedBy?: string,
    dueDate?: Date,
    isRequired = false
  ): Promise<string> {
    // Check if user is already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existingEnrollment) {
      throw new Error('User is already enrolled in this course');
    }

    // Get course details
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || course.status !== 'PUBLISHED') {
      throw new Error('Course not found or not available');
    }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
        assignedBy,
        dueDate,
        isRequired,
        status: 'ENROLLED',
      },
    });

    // Update course enrollment count
    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        totalEnrollments: { increment: 1 },
      },
    });

    // Publish event
    if (this.kafkaProducer) {
      await this.kafkaProducer.publishEvent('learning-events', {
        id: `enrollment_${enrollment.id}`,
        type: 'learning.course.enrolled',
        timestamp: new Date(),
        version: '1.0.0',
        source: 'learning-service',
        data: {
          enrollmentId: enrollment.id,
          userId,
          courseId,
          courseTitle: course.title,
          assignedBy,
          dueDate,
          isRequired,
        },
      });
    }

    logger.info('User enrolled in course', {
      enrollmentId: enrollment.id,
      userId,
      courseId,
      assignedBy,
    });

    return enrollment.id;
  }

  /**
   * Get user's learning dashboard
   */
  async getUserDashboard(userId: string): Promise<any> {
    const [profile, recommendations, recentActivity, upcomingDueDates] = await Promise.all([
      this.getUserLearningProfile(userId),
      this.getLearningRecommendations(userId, 5),
      this.getRecentLearningActivity(userId),
      this.getUpcomingDueDates(userId),
    ]);

    return {
      profile,
      recommendations,
      recentActivity,
      upcomingDueDates,
      generatedAt: new Date(),
    };
  }

  /**
   * Get recent learning activity for user
   */
  private async getRecentLearningActivity(userId: string, days = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.prisma.lessonProgress.findMany({
      where: {
        enrollment: { userId },
        lastAccessedAt: { gte: startDate },
      },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: 10,
    });

    return activities.map(activity => ({
      type: 'lesson_progress',
      lessonTitle: activity.lesson.title,
      courseTitle: activity.lesson.module.course.title,
      progress: activity.progress,
      timeSpent: activity.timeSpent,
      date: activity.lastAccessedAt,
    }));
  }

  /**
   * Get upcoming due dates for user
   */
  private async getUpcomingDueDates(userId: string, days = 30): Promise<any[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const dueCourses = await this.prisma.enrollment.findMany({
      where: {
        userId,
        status: { in: ['ENROLLED', 'IN_PROGRESS'] },
        dueDate: {
          lte: endDate,
          gte: new Date(),
        },
      },
      include: { course: true },
      orderBy: { dueDate: 'asc' },
    });

    return dueCourses.map(enrollment => ({
      enrollmentId: enrollment.id,
      courseTitle: enrollment.course.title,
      dueDate: enrollment.dueDate,
      progress: enrollment.progress,
      isRequired: enrollment.isRequired,
      daysRemaining: Math.ceil(
        (enrollment.dueDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }

  /**
   * Bulk enroll users in course
   */
  async bulkEnrollUsers(
    userIds: string[],
    courseId: string,
    assignedBy: string,
    options: {
      dueDate?: Date;
      isRequired?: boolean;
      notifyUsers?: boolean;
    } = {}
  ): Promise<string[]> {
    const enrollmentIds: string[] = [];

    for (const userId of userIds) {
      try {
        const enrollmentId = await this.enrollUserInCourse(
          userId,
          courseId,
          assignedBy,
          options.dueDate,
          options.isRequired
        );
        enrollmentIds.push(enrollmentId);
      } catch (error) {
        logger.error('Failed to enroll user in bulk operation', {
          userId,
          courseId,
          error: (error as Error).message,
        });
      }
    }

    return enrollmentIds;
  }

  /**
   * Generate learning report
   */
  async generateLearningReport(
    startDate: Date,
    endDate: Date,
    options: {
      includeUsers?: string[];
      includeDepartments?: string[];
      includeCourses?: string[];
    } = {}
  ): Promise<any> {
    const metrics = await this.getLearningMetrics(startDate, endDate);
    
    // Additional report data would be gathered here
    const departmentStats = await this.getDepartmentLearningStats(startDate, endDate);
    const popularCourses = await this.getPopularCourses(startDate, endDate);
    const skillsGained = await this.getSkillsGained(startDate, endDate);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: metrics,
      departmentBreakdown: departmentStats,
      popularCourses,
      skillsGained,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getDepartmentLearningStats(startDate: Date, endDate: Date): Promise<any[]> {
    // This would require integration with employee service to get department info
    // For now, return empty array
    return [];
  }

  private async getPopularCourses(startDate: Date, endDate: Date): Promise<any[]> {
    return this.prisma.course.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { totalEnrollments: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        totalEnrollments: true,
        averageRating: true,
        category: true,
      },
    });
  }

  private async getSkillsGained(startDate: Date, endDate: Date): Promise<any[]> {
    if (!this.skillService) return [];

    return this.prisma.employeeSkill.findMany({
      where: {
        acquiredAt: { gte: startDate, lte: endDate },
      },
      include: { skill: true },
      orderBy: { acquiredAt: 'desc' },
      take: 20,
    });
  }

  // Dashboard methods
  async getPersonalizedDashboard(userId: string): Promise<any> {
    try {
      const [enrollments, certificates, recommendations] = await Promise.all([
        this.prisma.enrollment.findMany({
          where: { userId },
          take: 5,
          orderBy: { lastAccessedAt: 'desc' },
          include: { course: { select: { title: true, thumbnailUrl: true } } },
        }),
        // Certificate model doesn't exist in schema, returning empty array
        Promise.resolve([]),
        this.getLearningRecommendations(userId, 5),
      ]);

      return {
        recentLearning: enrollments,
        certificates,
        recommendations,
        stats: {
          totalEnrollments: enrollments.length,
          completedCourses: enrollments.filter(e => e.status === 'COMPLETED').length,
        },
      };
    } catch (error) {
      logger.error('Failed to get personalized dashboard', error as Error);
      throw error;
    }
  }

  async getAdminDashboard(): Promise<any> {
    try {
      const [totalUsers, totalCourses, totalEnrollments] = await Promise.all([
        this.prisma.enrollment.groupBy({ by: ['userId'], _count: true }),
        this.prisma.course.count(),
        this.prisma.enrollment.count(),
      ]);

      return {
        stats: {
          totalUsers: totalUsers.length,
          totalCourses,
          totalEnrollments,
        },
        recentActivity: [],
      };
    } catch (error) {
      logger.error('Failed to get admin dashboard', error as Error);
      throw error;
    }
  }

  async getManagerDashboard(managerId: string): Promise<any> {
    try {
      return {
        teamStats: {
          totalTeamMembers: 0,
          activeEnrollments: 0,
          completedCourses: 0,
        },
        teamActivity: [],
      };
    } catch (error) {
      logger.error('Failed to get manager dashboard', error as Error);
      throw error;
    }
  }

  async getPersonalizedRecommendations(userId: string, limit = 5): Promise<any[]> {
    return this.getLearningRecommendations(userId, limit);
  }

  async getQuickStats(userId: string): Promise<any> {
    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId },
        select: { status: true, totalTimeSpent: true },
      });

      return {
        totalEnrollments: enrollments.length,
        completed: enrollments.filter(e => e.status === 'COMPLETED').length,
        inProgress: enrollments.filter(e => e.status === 'IN_PROGRESS').length,
        totalTimeSpent: enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0),
      };
    } catch (error) {
      logger.error('Failed to get quick stats', error as Error);
      throw error;
    }
  }

  async getRecentActivity(userId: string, limit = 10): Promise<any[]> {
    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId },
        take: limit,
        orderBy: { lastAccessedAt: 'desc' },
        include: { course: { select: { title: true } } },
      });

      return enrollments.map(e => ({
        type: 'enrollment',
        action: e.status === 'COMPLETED' ? 'completed' : 'accessed',
        courseTitle: 'Course',
        timestamp: e.lastAccessedAt || e.updatedAt,
      }));
    } catch (error) {
      logger.error('Failed to get recent activity', error as Error);
      throw error;
    }
  }

  async getUpcomingDeadlines(userId: string, limit = 5): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      logger.error('Failed to get upcoming deadlines', error as Error);
      throw error;
    }
  }

  async getLearningGoalsProgress(userId: string): Promise<any> {
    try {
      return {
        currentGoals: [],
        completedGoals: [],
        progress: 0,
      };
    } catch (error) {
      logger.error('Failed to get learning goals progress', error as Error);
      throw error;
    }
  }

  async getSkillProgress(userId: string): Promise<any> {
    try {
      return {
        skills: [],
        progress: 0,
        gaps: [],
      };
    } catch (error) {
      logger.error('Failed to get skill progress', error as Error);
      throw error;
    }
  }
}
