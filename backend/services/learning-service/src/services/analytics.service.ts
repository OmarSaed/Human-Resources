import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import {
  LearningAnalytics,
  CourseAnalytics,
  EmployeeAnalytics
} from '../models/analytics.models';

const logger = createLogger('analytics-service');


export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get comprehensive learning analytics
   */
  async getLearningAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<LearningAnalytics> {
    try {
      logger.info('Getting learning analytics', { startDate, endDate });

      const dateFilter = this.createDateFilter(startDate, endDate);

      const [overview, trends, performance, engagement] = await Promise.all([
        this.getOverviewAnalytics(dateFilter),
        this.getTrendAnalytics(dateFilter),
        this.getPerformanceAnalytics(dateFilter),
        this.getEngagementAnalytics(dateFilter),
      ]);

      const analytics: LearningAnalytics = {
        overview,
        trends,
        performance,
        engagement,
      };

      logger.info('Learning analytics generated', {
        totalEnrollments: overview.totalEnrollments,
        completionRate: overview.averageCompletionRate,
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting learning analytics', error as Error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific course
   */
  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
    try {
      logger.info('Getting course analytics', { courseId });

      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      const [overview, progress, engagement, feedback] = await Promise.all([
        this.getCourseOverview(courseId),
        this.getCourseProgress(courseId),
        this.getCourseEngagement(courseId),
        this.getCourseFeedback(courseId),
      ]);

      const analytics: CourseAnalytics = {
        courseId,
        courseTitle: course.title,
        overview,
        progress,
        engagement,
        feedback,
      };

      logger.info('Course analytics generated', {
        courseId,
        enrollments: overview.totalEnrollments,
        completionRate: overview.completionRate,
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting course analytics', error as Error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific employee
   */
  async getEmployeeAnalytics(employeeId: string): Promise<EmployeeAnalytics> {
    try {
      logger.info('Getting employee analytics', { employeeId });

      const [overview, learning, performance] = await Promise.all([
        this.getEmployeeOverview(employeeId),
        this.getEmployeeLearning(employeeId),
        this.getEmployeePerformance(employeeId),
      ]);

      const analytics: EmployeeAnalytics = {
        employeeId,
        overview,
        learning,
        performance,
      };

      logger.info('Employee analytics generated', {
        employeeId,
        completedCourses: overview.completedCourses,
        totalTimeSpent: overview.totalTimeSpent,
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting employee analytics', error as Error);
      throw error;
    }
  }

  /**
   * Get skill gap analysis
   */
  async getSkillGapAnalysis(departmentId?: string): Promise<Array<{
    skill: string;
    requiredLevel: number;
    currentLevel: number;
    gap: number;
    employeesNeedingTraining: number;
    recommendedCourses: Array<{
      courseId: string;
      courseTitle: string;
      relevanceScore: number;
    }>;
  }>> {
    try {
      logger.info('Getting skill gap analysis', { departmentId });

      // This would be enhanced with actual skill requirements and assessments
      const skillData = await this.prisma.course.findMany({
        select: {
          id: true,
          title: true,
          skills: true,
          enrollments: {
            where: {
              status: 'COMPLETED',
            },
            select: {
              userId: true,
            },
          },
        },
      });

      const skillAnalysis = this.analyzeSkillGaps(skillData, departmentId);

      logger.info('Skill gap analysis completed', {
        skillsAnalyzed: skillAnalysis.length,
        departmentId,
      });

      return skillAnalysis;
    } catch (error) {
      logger.error('Error getting skill gap analysis', error as Error);
      throw error;
    }
  }

  /**
   * Get learning ROI metrics
   */
  async getLearningROI(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalInvestment: number;
    timeInvestment: number;
    coursesCompleted: number;
    skillsAcquired: number;
    employeesImpacted: number;
    roiScore: number;
    breakdown: Array<{
      category: string;
      investment: number;
      impact: number;
      roi: number;
    }>;
  }> {
    try {
      logger.info('Getting learning ROI metrics', { startDate, endDate });

      const dateFilter = this.createDateFilter(startDate, endDate);

      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          enrolledAt: dateFilter,
        },
        include: {
          course: {
            select: {
              price: true,
              category: true,
              skills: true,
            },
          },
        },
      });

      const totalInvestment = enrollments.reduce(
        (sum: number, e: any) => sum + (e.course.price || 0),
        0
      );

      const timeInvestment = enrollments.reduce(
        (sum: number, e: any) => sum + (e.timeSpent || 0),
        0
      );

      const coursesCompleted = enrollments.filter(
        (e: any) => e.status === 'COMPLETED'
      ).length;

      const skillsAcquired = new Set(
        enrollments
          .filter((e: any) => e.status === 'COMPLETED')
          .flatMap((e: any) => e.course.skills || [])
      ).size;

      const employeesImpacted = new Set(
        enrollments.map((e: any) => e.userId)
      ).size;

      // Simplified ROI calculation
      const roiScore = totalInvestment > 0 
        ? ((skillsAcquired * 1000 + coursesCompleted * 500) / totalInvestment) * 100
        : 0;

      // Category breakdown
      const categoryData = this.groupBy(enrollments, (e: any) => e.course.category || 'Uncategorized');
      const breakdown = Object.entries(categoryData).map(([category, items]: [string, any[]]) => {
        const investment = items.reduce((sum: number, e: any) => sum + (e.course.price || 0), 0);
        const completions = items.filter((e: any) => e.status === 'COMPLETED').length;
        const impact = completions * 500; // Simplified impact calculation
        
        return {
          category,
          investment,
          impact,
          roi: investment > 0 ? (impact / investment) * 100 : 0,
        };
      });

      const roiMetrics = {
        totalInvestment,
        timeInvestment,
        coursesCompleted,
        skillsAcquired,
        employeesImpacted,
        roiScore,
        breakdown,
      };

      logger.info('Learning ROI calculated', {
        totalInvestment,
        roiScore: Math.round(roiScore),
        employeesImpacted,
      });

      return roiMetrics;
    } catch (error) {
      logger.error('Error getting learning ROI', error as Error);
      throw error;
    }
  }

  // Private helper methods

  private createDateFilter(startDate?: Date, endDate?: Date) {
    if (!startDate && !endDate) return undefined;
    
    const filter: any = {};
    if (startDate) filter.gte = startDate;
    if (endDate) filter.lte = endDate;
    
    return filter;
  }

  private async getOverviewAnalytics(dateFilter?: any) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: dateFilter ? { enrolledAt: dateFilter } : undefined,
      select: {
        status: true,
        totalTimeSpent: true,
      },
    });

    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter((e: any) => e.status === 'IN_PROGRESS').length;
    const completedEnrollments = enrollments.filter((e: any) => e.status === 'COMPLETED').length;
    const averageCompletionRate = totalEnrollments > 0 
      ? (completedEnrollments / totalEnrollments) * 100 
      : 0;
    const totalTimeSpent = enrollments.reduce((sum: number, e: any) => sum + (e.totalTimeSpent || 0), 0);
    const averageTimePerCourse = totalEnrollments > 0 
      ? totalTimeSpent / totalEnrollments 
      : 0;

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      averageCompletionRate,
      totalTimeSpent,
      averageTimePerCourse,
    };
  }

  private async getTrendAnalytics(dateFilter?: any) {
    // Simplified trend analysis - would be enhanced with actual time-series data
    return {
      enrollmentsByMonth: [],
      timeSpentByMonth: [],
      popularCourses: [],
    };
  }

  private async getPerformanceAnalytics(dateFilter?: any) {
    // Simplified performance analysis
    return {
      topPerformers: [],
      skillsAcquired: [],
      certificatesEarned: [],
    };
  }

  private async getEngagementAnalytics(dateFilter?: any) {
    // Simplified engagement analysis
    return {
      dailyActiveUsers: [],
      retentionRates: {
        week1: 0,
        week2: 0,
        month1: 0,
        month3: 0,
      },
      dropoffAnalysis: [],
    };
  }

  private async getCourseOverview(courseId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      select: {
        status: true,
        totalTimeSpent: true,
        completedAt: true,
        enrolledAt: true,
      },
    });

    const totalEnrollments = enrollments.length;
    const completions = enrollments.filter((e: any) => e.status === 'COMPLETED').length;
    const completionRate = totalEnrollments > 0 ? (completions / totalEnrollments) * 100 : 0;
    
    const completedEnrollments = enrollments.filter((e: any) => e.completedAt);
    const averageTimeToComplete = completedEnrollments.length > 0
      ? completedEnrollments.reduce((sum: number, e: any) => {
          const timeToComplete = e.completedAt!.getTime() - e.enrolledAt.getTime();
          return sum + timeToComplete;
        }, 0) / completedEnrollments.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    const totalTimeSpent = enrollments.reduce((sum: number, e: any) => sum + (e.totalTimeSpent || 0), 0);

    return {
      totalEnrollments,
      completions,
      completionRate,
      averageTimeToComplete,
      averageRating: 0, // Would come from course reviews
      totalTimeSpent,
    };
  }

  private async getCourseProgress(courseId: string) {
    // Simplified progress analysis
    return {
      progressDistribution: [],
      averageProgressByWeek: [],
    };
  }

  private async getCourseEngagement(courseId: string) {
    // Simplified engagement analysis
    return {
      dailyActivity: [],
      chapterCompletionRates: [],
    };
  }

  private async getCourseFeedback(courseId: string) {
    // Simplified feedback analysis
    return {
      ratingDistribution: [],
      averageRating: 0,
      totalReviews: 0,
      commonFeedback: [],
    };
  }

  private async getEmployeeOverview(employeeId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: employeeId },
      select: {
        status: true,
        totalTimeSpent: true,
      },
    });

    const certificates = await this.prisma.certificate.findMany({
      where: { userId: employeeId },
    });

    const totalEnrollments = enrollments.length;
    const completedCourses = enrollments.filter((e: any) => e.status === 'COMPLETED').length;
    const inProgressCourses = enrollments.filter((e: any) => e.status === 'IN_PROGRESS').length;
    const totalTimeSpent = enrollments.reduce((sum: number, e: any) => sum + (e.totalTimeSpent || 0), 0);

    return {
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      totalTimeSpent,
      averageScore: 0, // Would come from assessment scores
      certificatesEarned: certificates.length,
    };
  }

  private async getEmployeeLearning(employeeId: string) {
    // Simplified learning analysis
    return {
      monthlyProgress: [],
      skillsDeveloped: [],
      learningPaths: [],
    };
  }

  private async getEmployeePerformance(employeeId: string) {
    // Simplified performance analysis
    return {
      averageScores: [],
      streaks: {
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: new Date(),
      },
      goals: [],
    };
  }

  private analyzeSkillGaps(skillData: any[], departmentId?: string) {
    // Simplified skill gap analysis
    return [];
  }

  private groupBy<T>(array: T[], keySelector: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keySelector(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}
