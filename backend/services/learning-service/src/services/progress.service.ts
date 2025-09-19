import { PrismaClient, Enrollment, Course } from '@prisma/client';
import { createLogger, Employee } from '@hrms/shared';
import {
  LearningProgress,
  ProgressMilestone,
  ProgressSummary,
  ProgressAnalytics
} from '../models/progress.models';

const logger = createLogger('progress-service');



export class ProgressService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get learning progress for a specific enrollment
   */
  async getLearningProgress(enrollmentId: string): Promise<LearningProgress | null> {
    try {
      logger.info('Getting learning progress', { enrollmentId });

      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: true,
        },
      });

      if (!enrollment) {
        logger.warn('Enrollment not found', { enrollmentId });
        return null;
      }

      // Calculate estimated time remaining
      const totalDuration = enrollment.course.duration || 0;
      const progressPercentage = enrollment.progress || 0;
      const timeSpent = enrollment.totalTimeSpent || 0;
      const estimatedTimeRemaining = Math.max(0, totalDuration - timeSpent);

      // Get milestones (this would be enhanced with actual milestone data)
      const milestones = this.generateProgressMilestones(progressPercentage);

      const progress: LearningProgress = {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        employeeId: enrollment.userId,
        progressPercentage,
        timeSpent,
        currentChapter: "1", // currentChapter field not in schema
        currentLesson: enrollment.currentLessonId || undefined,
        lastAccessedAt: enrollment.lastAccessedAt || enrollment.updatedAt,
        estimatedTimeRemaining,
        milestones,
      };

      logger.info('Learning progress retrieved', { 
        enrollmentId,
        progressPercentage,
        timeSpent 
      });

      return progress;
    } catch (error) {
      logger.error('Error getting learning progress', error as Error);
      throw error;
    }
  }

  /**
   * Update learning progress
   */
  async updateProgress(
    enrollmentId: string,
    progressData: {
      progressPercentage?: number;
      timeSpent?: number;
      currentChapter?: string;
      currentLesson?: string;
    }
  ): Promise<LearningProgress> {
    try {
      logger.info('Updating learning progress', { 
        enrollmentId,
        progressPercentage: progressData.progressPercentage,
        timeSpent: progressData.timeSpent 
      });

      const updatedEnrollment = await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          ...progressData,
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          course: true,
        },
      });

      // Check if course is now completed
      if (progressData.progressPercentage && progressData.progressPercentage >= 100) {
        await this.prisma.enrollment.update({
          where: { id: enrollmentId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      return this.getLearningProgress(enrollmentId) as Promise<LearningProgress>;
    } catch (error) {
      logger.error('Error updating learning progress', error as Error);
      throw error;
    }
  }

  /**
   * Get progress summary for an employee
   */
  async getProgressSummary(employeeId: string): Promise<ProgressSummary> {
    try {
      logger.info('Getting progress summary', { employeeId });

      const [enrollments, certificates] = await Promise.all([
        this.prisma.enrollment.findMany({
          where: { userId: employeeId },
          include: {
            course: {
              select: {
                title: true,
                // skills: true, // Skills field not in current schema
              },
            },
          },
        }),
        this.prisma.certificate.findMany({
          where: { userId: employeeId },
        }),
      ]);

      const totalCourses = enrollments.length;
      const completedCourses = enrollments.filter(e => e.status === 'COMPLETED').length;
      const inProgressCourses = enrollments.filter(e => e.status === 'IN_PROGRESS').length;
      const totalTimeSpent = enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0);
      const averageProgress = totalCourses > 0 
        ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / totalCourses 
        : 0;

      // Extract unique skills from completed courses
      const skillsAcquired = [...new Set(
        enrollments
          .filter(e => e.status === 'COMPLETED')
          .flatMap(e => []) // Note: Course skills not available in current schema
      )];

      // Get recent activity
      const recentActivity = enrollments
        .filter(e => e.lastAccessedAt)
        .sort((a, b) => (b.lastAccessedAt?.getTime() || 0) - (a.lastAccessedAt?.getTime() || 0))
        .slice(0, 10)
        .map(e => ({
          courseTitle: 'Course Title', // Course relation not included in current query
          activity: e.status === 'COMPLETED' ? 'Completed' : 'Continued learning',
          timestamp: e.lastAccessedAt || e.updatedAt,
        }));

      const summary: ProgressSummary = {
        totalCourses,
        completedCourses,
        inProgressCourses,
        totalTimeSpent,
        averageProgress,
        certificatesEarned: certificates.length,
        skillsAcquired,
        recentActivity,
      };

      logger.info('Progress summary generated', { 
        employeeId,
        totalCourses,
        completedCourses,
        averageProgress: Math.round(averageProgress) 
      });

      return summary;
    } catch (error) {
      logger.error('Error getting progress summary', error as Error);
      throw error;
    }
  }

  /**
   * Get progress analytics for an employee
   */
  async getProgressAnalytics(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProgressAnalytics> {
    try {
      logger.info('Getting progress analytics', { employeeId, startDate, endDate });

      const dateRange = {
        start: startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        end: endDate || new Date(),
      };

      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          userId: employeeId,
          updatedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        include: {
          course: true,
        },
        orderBy: { updatedAt: 'asc' },
      });

      // Generate daily progress data
      const dailyProgress = this.generateDailyProgressData(enrollments, dateRange);

      // Calculate weekly stats
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentEnrollments = enrollments.filter(e => e.updatedAt >= weekAgo);
      
      const weeklyStats = {
        coursesStarted: recentEnrollments.filter(e => e.enrolledAt >= weekAgo).length,
        coursesCompleted: recentEnrollments.filter(e => 
          e.status === 'COMPLETED' && e.completedAt && e.completedAt >= weekAgo
        ).length,
        totalTimeSpent: recentEnrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0),
        averageSessionLength: this.calculateAverageSessionLength(recentEnrollments),
      };

      // Calculate monthly trends
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const monthlyEnrollments = enrollments.filter(e => e.updatedAt >= monthAgo);
      
      const monthlyTrends = {
        completionRate: this.calculateCompletionRate(monthlyEnrollments),
        engagementScore: this.calculateEngagementScore(monthlyEnrollments),
        learningVelocity: this.calculateLearningVelocity(monthlyEnrollments),
      };

      // Calculate trends (simplified implementation)
      const trends = {
        progressTrend: 'STABLE' as 'IMPROVING' | 'STABLE' | 'DECLINING',
        engagementScore: monthlyTrends.engagementScore,
        consistencyScore: 75, // Placeholder value
      };

      const analytics: ProgressAnalytics = {
        dailyProgress,
        weeklyStats,
        monthlyTrends,
        trends,
      };

      logger.info('Progress analytics generated', { 
        employeeId,
        dailyDataPoints: dailyProgress.length,
        weeklyTimeSpent: weeklyStats.totalTimeSpent 
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting progress analytics', error as Error);
      throw error;
    }
  }

  /**
   * Track learning session
   */
  async trackSession(
    enrollmentId: string,
    sessionData: {
      timeSpent: number;
      progressGained: number;
      chaptersCompleted?: string[];
      lessonsCompleted?: string[];
    }
  ): Promise<void> {
    try {
      logger.info('Tracking learning session', { 
        enrollmentId,
        timeSpent: sessionData.timeSpent,
        progressGained: sessionData.progressGained 
      });

      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          totalTimeSpent: {
            increment: sessionData.timeSpent,
          },
          progress: {
            increment: sessionData.progressGained,
          },
          lastAccessedAt: new Date(),
        },
      });

      // TODO: Create detailed session tracking record
      // This could be enhanced with a separate SessionLog model

      logger.info('Learning session tracked successfully', { enrollmentId });
    } catch (error) {
      logger.error('Error tracking learning session', error as Error);
      throw error;
    }
  }

  /**
   * Get learning streaks for an employee
   */
  async getLearningStreaks(employeeId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivity: Date | null;
  }> {
    try {
      logger.info('Getting learning streaks', { employeeId });

      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId: employeeId },
        select: {
          lastAccessedAt: true,
          updatedAt: true,
        },
        orderBy: { lastAccessedAt: 'desc' },
      });

      const activityDates = enrollments
        .map(e => e.lastAccessedAt || e.updatedAt)
        .map(date => date.toISOString().split('T')[0]) // Get just the date part
        .filter((date, index, array) => array.indexOf(date) === index) // Remove duplicates
        .sort();

      const { currentStreak, longestStreak } = this.calculateStreaks(activityDates);
      const lastActivity = enrollments[0]?.lastAccessedAt || enrollments[0]?.updatedAt || null;

      logger.info('Learning streaks calculated', { 
        employeeId,
        currentStreak,
        longestStreak 
      });

      return { currentStreak, longestStreak, lastActivity };
    } catch (error) {
      logger.error('Error getting learning streaks', error as Error);
      throw error;
    }
  }

  /**
   * Generate progress milestones based on current progress
   */
  private generateProgressMilestones(currentProgress: number): ProgressMilestone[] {
    const milestones = [
      { percentage: 25, title: 'Getting Started', description: 'Course basics completed' },
      { percentage: 50, title: 'Halfway There', description: 'Making good progress' },
      { percentage: 75, title: 'Almost Done', description: 'Nearly finished' },
      { percentage: 100, title: 'Course Complete', description: 'Congratulations!' },
    ];

    return milestones.map((milestone, index) => ({
      id: `milestone-${index}`,
      title: milestone.title,
      description: milestone.description,
      targetPercentage: milestone.percentage,
      isCompleted: currentProgress >= milestone.percentage,
      achievedAt: currentProgress >= milestone.percentage ? new Date() : undefined,
    }));
  }

  /**
   * Generate daily progress data
   */
  private generateDailyProgressData(
    enrollments: any[],
    dateRange: { start: Date; end: Date }
  ): Array<{ date: string; timeSpent: number; progressGained: number }> {
    const dailyData: Record<string, { timeSpent: number; progressGained: number }> = {};

    // Initialize all dates in range
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = { timeSpent: 0, progressGained: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // This would be enhanced with actual session tracking data
    // For now, we'll use enrollment update patterns as proxy
    enrollments.forEach(enrollment => {
      const dateKey = enrollment.updatedAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].timeSpent += enrollment.timeSpent || 0;
        dailyData[dateKey].progressGained += 5; // Placeholder increment
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        timeSpent: data.timeSpent,
        progressGained: data.progressGained,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate average session length
   */
  private calculateAverageSessionLength(enrollments: any[]): number {
    const sessions = enrollments.filter(e => e.timeSpent > 0);
    if (sessions.length === 0) return 0;
    
    const totalTime = sessions.reduce((sum, e) => sum + e.timeSpent, 0);
    return Math.round(totalTime / sessions.length);
  }

  /**
   * Calculate completion rate
   */
  private calculateCompletionRate(enrollments: any[]): number {
    if (enrollments.length === 0) return 0;
    
    const completed = enrollments.filter(e => e.status === 'COMPLETED').length;
    return Math.round((completed / enrollments.length) * 100);
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(enrollments: any[]): number {
    if (enrollments.length === 0) return 0;

    const totalTimeSpent = enrollments.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
    const averageProgress = enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length;
    const recentActivity = enrollments.filter(e => 
      e.lastAccessedAt && e.lastAccessedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Simplified engagement calculation
    const timeScore = Math.min(totalTimeSpent / 100, 40); // Max 40 points for time
    const progressScore = averageProgress * 0.4; // Max 40 points for progress
    const activityScore = Math.min(recentActivity * 5, 20); // Max 20 points for activity

    return Math.round(timeScore + progressScore + activityScore);
  }

  /**
   * Calculate learning velocity (progress per unit time)
   */
  private calculateLearningVelocity(enrollments: any[]): number {
    const activeEnrollments = enrollments.filter(e => e.timeSpent > 0);
    if (activeEnrollments.length === 0) return 0;

    const totalProgress = activeEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0);
    const totalTime = activeEnrollments.reduce((sum, e) => sum + e.timeSpent, 0);

    return totalTime > 0 ? Math.round((totalProgress / totalTime) * 60) : 0; // Progress per hour
  }

  /**
   * Calculate learning streaks
   */
  private calculateStreaks(activityDates: string[]): { currentStreak: number; longestStreak: number } {
    if (activityDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check if current streak is active
    if (activityDates.includes(today) || activityDates.includes(yesterday)) {
      currentStreak = 1;
      
      // Calculate current streak length
      for (let i = activityDates.length - 2; i >= 0; i--) {
        const currentDate = new Date(activityDates[i + 1]);
        const prevDate = new Date(activityDates[i]);
        const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < activityDates.length; i++) {
      const currentDate = new Date(activityDates[i]);
      const prevDate = new Date(activityDates[i - 1]);
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { currentStreak, longestStreak };
  }
}
