import { PrismaClient, LearningPath, LearningPathEnrollment, Course } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('learning-path-service');

export interface CreateLearningPathData {
  title: string;
  description?: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration: number; // in hours
  courseIds: string[];
  prerequisites?: string[];
  skills?: string[];
  isActive?: boolean;
  tags?: string[];
  createdBy: string;
}

export interface UpdateLearningPathData {
  title?: string;
  description?: string;
  category?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration?: number;
  courseIds?: string[];
  prerequisites?: string[];
  skills?: string[];
  isActive?: boolean;
  tags?: string[];
  updatedBy?: string;
}

export interface LearningPathFilters {
  category?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  isActive?: boolean;
  search?: string;
}

export interface LearningPathProgress {
  pathId: string;
  employeeId: string;
  totalCourses: number;
  completedCourses: number;
  progressPercentage: number;
  completedCourseIds: string[];
  currentCourse?: Course;
  estimatedTimeRemaining: number;
}

export interface LearningPathAnalytics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageCompletionTime: number;
  completionRate: number;
  popularityScore: number;
  enrollmentsByMonth: Array<{
    month: string;
    enrollments: number;
    completions: number;
  }>;
  courseCompletionRates: Array<{
    courseId: string;
    courseName: string;
    completionRate: number;
  }>;
}

export interface LearningPathRecommendation {
  path: LearningPath;
  score: number;
  reasons: string[];
  matchingSkills: string[];
  difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING';
}

export class LearningPathService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new learning path
   */
  async createLearningPath(data: CreateLearningPathData): Promise<LearningPath> {
    try {
      logger.info('Creating learning path', {
        title: data.title,
        category: data.category,
        courseCount: data.courseIds.length,
      });

      // Validate courses exist
      const courses = await this.prisma.course.findMany({
        where: { id: { in: data.courseIds } },
        select: { id: true },
      });

      if (courses.length !== data.courseIds.length) {
        throw new Error('One or more courses not found');
      }

      const learningPath = await this.prisma.learningPath.create({
        data: {
          title: data.title,
          description: data.description || '',
          category: data.category as any,
          level: data.level,
          estimatedDuration: data.estimatedDuration,
          estimatedHours: data.estimatedDuration, // Add required field
          courseIds: data.courseIds,
          courses: data.courseIds.map((id: string, index: number) => ({
            courseId: id,
            order: index + 1,
            isRequired: true,
          })), // Add required courses field as JSON
          prerequisites: data.prerequisites || [],
          skills: data.skills || [],
          isPublished: data.isActive ?? true,
          tags: data.tags || [],
          authorId: data.createdBy,
        },
        include: {
          // courses: true, // Courses relation not available in current schema
        },
      });

      logger.info('Learning path created successfully', {
        pathId: learningPath.id,
        title: learningPath.title,
      });

      return learningPath;
    } catch (error) {
      logger.error('Error creating learning path', error as Error);
      throw error;
    }
  }

  /**
   * Get learning paths with pagination and filtering
   */
  async listLearningPaths(
    page: number = 1,
    limit: number = 10,
    filters: LearningPathFilters = {}
  ): Promise<{ learningPaths: LearningPath[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const where: any = {};

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.level) {
        where.level = filters.level;
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { category: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [learningPaths, total] = await Promise.all([
        this.prisma.learningPath.findMany({
          where,
          include: {
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.learningPath.count({ where }),
      ]);

      logger.info('Listed learning paths', {
        count: learningPaths.length,
        total,
        page,
        limit,
      });

      return { learningPaths, total };
    } catch (error) {
      logger.error('Error listing learning paths', error as Error);
      throw error;
    }
  }

  /**
   * Get a learning path by ID
   */
  async getLearningPathById(
    id: string,
    employeeId?: string
  ): Promise<(LearningPath & { userProgress?: LearningPathProgress }) | null> {
    try {
      const learningPath = await this.prisma.learningPath.findUnique({
        where: { id },
        include: {
          enrollments: employeeId
            ? {
                where: { userId: employeeId },
                take: 1,
              }
            : false,
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      });

      if (!learningPath) {
        logger.warn('Learning path not found', { pathId: id });
        return null;
      }

      let result: any = learningPath;

      // Add user progress if employeeId provided
      if (employeeId && (learningPath as any).enrollments?.length > 0) {
        const progress = await this.calculateLearningPathProgress(id, employeeId);
        result.userProgress = progress;
      }

      logger.info('Retrieved learning path', { pathId: id, withProgress: !!employeeId });

      return result;
    } catch (error) {
      logger.error('Error getting learning path', error as Error);
      throw error;
    }
  }

  /**
   * Update a learning path
   */
  async updateLearningPath(id: string, data: UpdateLearningPathData): Promise<LearningPath> {
    try {
      logger.info('Updating learning path', { pathId: id });

      // Validate courses if courseIds provided
      if (data.courseIds) {
        const courses = await this.prisma.course.findMany({
          where: { id: { in: data.courseIds } },
          select: { id: true },
        });

        if (courses.length !== data.courseIds.length) {
          throw new Error('One or more courses not found');
        }
      }

      const updateData: any = { ...data };
      if (data.updatedBy) {
        updateData.updatedAt = new Date();
      }

      const learningPath = await this.prisma.learningPath.update({
        where: { id },
        data: updateData,
        include: {
          // courses: true, // Courses relation not available in current schema
        },
      });

      logger.info('Learning path updated successfully', {
        pathId: id,
        title: learningPath.title,
      });

      return learningPath;
    } catch (error) {
      logger.error('Error updating learning path', error as Error);
      throw error;
    }
  }

  /**
   * Delete a learning path
   */
  async deleteLearningPath(id: string): Promise<void> {
    try {
      logger.info('Deleting learning path', { pathId: id });

      // Check if path has active enrollments
      const activeEnrollments = await this.prisma.learningPathEnrollment.count({
        where: {
          learningPathId: id,
          status: 'IN_PROGRESS',
        },
      });

      if (activeEnrollments > 0) {
        throw new Error('Cannot delete learning path with active enrollments');
      }

      await this.prisma.learningPath.delete({
        where: { id },
      });

      logger.info('Learning path deleted successfully', { pathId: id });
    } catch (error) {
      logger.error('Error deleting learning path', error as Error);
      throw error;
    }
  }

  /**
   * Enroll employee in learning path
   */
  async enrollInLearningPath(
    pathId: string,
    employeeId: string,
    enrolledBy: string
  ): Promise<LearningPathEnrollment> {
    try {
      logger.info('Enrolling in learning path', {
        pathId,
        employeeId,
        enrolledBy,
      });

      // Check if already enrolled
      const existingEnrollment = await this.prisma.learningPathEnrollment.findUnique({
        where: {
          userId_learningPathId: {
            userId: employeeId,
            learningPathId: pathId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error('Employee is already enrolled in this learning path');
      }

      // Validate learning path exists and is active
      const learningPath = await this.prisma.learningPath.findUnique({
        where: { id: pathId },
        select: { id: true, isPublished: true, estimatedHours: true },
      });

      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      if (!learningPath.isPublished) {
        throw new Error('Learning path is not active');
      }

      const enrollment = await this.prisma.learningPathEnrollment.create({
        data: {
          learningPathId: pathId,
          userId: employeeId,
        },
        include: {
          path: {
            select: {
              title: true,
              enrollments: true,
            },
          },
        },
      });

      logger.info('Enrollment created successfully', {
        enrollmentId: enrollment.id,
        pathId,
        employeeId,
      });

      return enrollment;
    } catch (error) {
      logger.error('Error enrolling in learning path', error as Error);
      throw error;
    }
  }

  /**
   * Get learning path enrollment
   */
  async getLearningPathEnrollment(
    pathId: string,
    employeeId: string
  ): Promise<(LearningPathEnrollment & { progress: LearningPathProgress }) | null> {
    try {
      const enrollment = await this.prisma.learningPathEnrollment.findUnique({
        where: {
          userId_learningPathId: {
            userId: employeeId,
            learningPathId: pathId,
          },
        },
        include: {
          path: {
            include: {
              // courses: true, // Courses relation not available in current schema
            },
          },
        },
      });

      if (!enrollment) {
        return null;
      }

      const progress = await this.calculateLearningPathProgress(pathId, employeeId);

      logger.info('Retrieved learning path enrollment', {
        pathId,
        employeeId,
        progress: progress.progressPercentage,
      });

      return {
        ...enrollment,
        detailedProgress: progress, // Keep full progress object separate
      } as any; // Cast to any to avoid type conflicts
    } catch (error) {
      logger.error('Error getting learning path enrollment', error as Error);
      throw error;
    }
  }

  /**
   * Update learning path progress
   */
  async updateLearningPathProgress(
    pathId: string,
    employeeId: string,
    courseId: string,
    completed: boolean
  ): Promise<LearningPathEnrollment> {
    try {
      logger.info('Updating learning path progress', {
        pathId,
        employeeId,
        courseId,
        completed,
      });

      // Verify enrollment exists
      const enrollment = await this.prisma.learningPathEnrollment.findUnique({
        where: {
          userId_learningPathId: {
            userId: employeeId,
            learningPathId: pathId,
          },
        },
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Update course completion
      const completedCourseIds = [...enrollment.completedCourseIds];

      if (completed && !completedCourseIds.includes(courseId)) {
        completedCourseIds.push(courseId);
      } else if (!completed && completedCourseIds.includes(courseId)) {
        const index = completedCourseIds.indexOf(courseId);
        completedCourseIds.splice(index, 1);
      }

      // Calculate if path is now completed
      const learningPath = await this.prisma.learningPath.findUnique({
        where: { id: pathId },
        select: { courseIds: true },
      });

      const isCompleted =
        learningPath?.courseIds.every((id) => completedCourseIds.includes(id)) || false;

      const updatedEnrollment = await this.prisma.learningPathEnrollment.update({
        where: {
          userId_learningPathId: {
            userId: employeeId,
            learningPathId: pathId,
          },
        },
        data: {
          completedCourseIds,
          completedAt: isCompleted ? new Date() : null,
        },
        include: {
          path: true,
        },
      });

      logger.info('Learning path progress updated', {
        pathId,
        employeeId,
        isCompleted,
        progressPercentage:
          (completedCourseIds.length / (learningPath?.courseIds.length || 1)) * 100,
      });

      return updatedEnrollment;
    } catch (error) {
      logger.error('Error updating learning path progress', error as Error);
      throw error;
    }
  }

  /**
   * Calculate learning path progress
   */
  private async calculateLearningPathProgress(
    pathId: string,
    employeeId: string
  ): Promise<LearningPathProgress> {
    try {
      const enrollment = await this.prisma.learningPathEnrollment.findUnique({
        where: {
          userId_learningPathId: {
            userId: employeeId,
            learningPathId: pathId,
          },
        },
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Get the learning path to access courses data
      const learningPath = await this.prisma.learningPath.findUnique({
        where: { id: pathId },
      });

      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      // courses is a Json field, so we need to parse it
      const courses = Array.isArray(learningPath.courses) ? (learningPath.courses as any[]) : [];
      const totalCourses = courses.length;
      const completedCourses = enrollment.completedCourseIds.length;
      const progressPercentage = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

      // Find current course (next incomplete course)
      const currentCourse = courses.find(
        (course: any) => !enrollment.completedCourseIds.includes(course.id || course.courseId)
      );

      // Estimate remaining time
      const remainingCourses = courses.filter(
        (course: any) => !enrollment.completedCourseIds.includes(course.id || course.courseId)
      );
      const estimatedTimeRemaining = remainingCourses.reduce(
        (total: number, course: any) => total + (course.duration || 0),
        0
      );

      return {
        pathId,
        employeeId,
        totalCourses,
        completedCourses,
        progressPercentage,
        completedCourseIds: enrollment.completedCourseIds,
        currentCourse,
        estimatedTimeRemaining,
      };
    } catch (error) {
      logger.error('Error calculating learning path progress', error as Error);
      throw error;
    }
  }

  /**
   * Get learning path analytics
   */
  async getLearningPathAnalytics(
    pathId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<LearningPathAnalytics> {
    try {
      logger.info('Getting learning path analytics', {
        pathId,
        startDate,
        endDate,
      });

      const whereClause: any = { pathId };
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        enrollmentData,
        completionTimes,
      ] = await Promise.all([
        this.prisma.learningPathEnrollment.count({ where: whereClause }),
        this.prisma.learningPathEnrollment.count({
          where: { ...whereClause, isCompleted: false },
        }),
        this.prisma.learningPathEnrollment.count({
          where: { ...whereClause, isCompleted: true },
        }),
        this.prisma.learningPathEnrollment.findMany({
          where: whereClause,
          select: {
            createdAt: true,
            completedAt: true,
          },
        }),
        this.prisma.learningPathEnrollment.findMany({
          where: {
            ...whereClause,
            isCompleted: true,
            completedAt: { not: null },
          },
          select: {
            createdAt: true,
            completedAt: true,
          },
        }),
      ]);

      // Calculate average completion time
      const completionTimesInDays = completionTimes
        .filter((item) => item.completedAt)
        .map((item) => {
          const diffTime = Math.abs(item.completedAt!.getTime() - item.createdAt.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });

      const averageCompletionTime =
        completionTimesInDays.length > 0
          ? completionTimesInDays.reduce((sum, days) => sum + days, 0) /
            completionTimesInDays.length
          : 0;

      const completionRate =
        totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

      // Calculate popularity score (enrollments per month)
      const monthsAgo = 12;
      const popularityScore = totalEnrollments / monthsAgo;

      // Group enrollments by month
      const enrollmentsByMonth = this.groupEnrollmentsByMonth(enrollmentData, monthsAgo);

      // Get course completion rates
      const learningPath = await this.prisma.learningPath.findUnique({
        where: { id: pathId },
        include: { enrollments: true },
      });

      // courses is a Json field, so we need to parse it
      const courses =
        learningPath && Array.isArray(learningPath.courses) ? (learningPath.courses as any[]) : [];
      const courseCompletionRates = courses.map((course: any) => {
        const completions = enrollmentData.filter(
          (enrollment) => enrollment.completedAt // Only completed enrollments would have course completions
        ).length;

        return {
          courseId: course.id || course.courseId,
          courseName: course.title || course.name,
          completionRate: totalEnrollments > 0 ? (completions / totalEnrollments) * 100 : 0,
        };
      });

      const analytics: LearningPathAnalytics = {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        averageCompletionTime,
        completionRate,
        popularityScore,
        enrollmentsByMonth,
        courseCompletionRates,
      };

      logger.info('Learning path analytics calculated', {
        pathId,
        totalEnrollments,
        completionRate: Math.round(completionRate),
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting learning path analytics', error as Error);
      throw error;
    }
  }

  /**
   * Group enrollments by month
   */
  private groupEnrollmentsByMonth(
    enrollments: Array<{ createdAt: Date; completedAt: Date | null }>,
    monthsBack: number
  ): Array<{ month: string; enrollments: number; completions: number }> {
    const monthlyData: Record<string, { enrollments: number; completions: number }> = {};

    // Initialize months
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
      monthlyData[monthKey] = { enrollments: 0, completions: 0 };
    }

    // Count enrollments and completions
    enrollments.forEach((enrollment) => {
      const enrollmentMonth = enrollment.createdAt.toISOString().substring(0, 7);
      if (monthlyData[enrollmentMonth]) {
        monthlyData[enrollmentMonth].enrollments++;
      }

      if (enrollment.completedAt) {
        const completionMonth = enrollment.completedAt.toISOString().substring(0, 7);
        if (monthlyData[completionMonth]) {
          monthlyData[completionMonth].completions++;
        }
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        enrollments: data.enrollments,
        completions: data.completions,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get recommended learning paths for employee
   */
  async getRecommendedLearningPaths(employeeId: string): Promise<LearningPathRecommendation[]> {
    try {
      logger.info('Getting recommended learning paths', { employeeId });

      // Get employee's current enrollments and skills
      const [enrollments, employee] = await Promise.all([
        this.prisma.learningPathEnrollment.findMany({
          where: { userId: employeeId },
          select: { learningPathId: true, status: true },
        }),
        // Note: This would typically come from employee service
        // For now, we'll use a placeholder or get basic employee data
        this.getEmployeeSkills(employeeId),
      ]);

      const enrolledPathIds = enrollments.map((e) => e.learningPathId);

      // Get learning paths not yet enrolled in
      const availablePaths = await this.prisma.learningPath.findMany({
        where: {
          isPublished: true, // Using isPublished instead of isActive
          id: { notIn: enrolledPathIds },
        },
        include: {
          _count: {
            select: { enrollments: true },
          },
        },
      });

      // Calculate recommendations based on skills, popularity, and difficulty
      const recommendations: LearningPathRecommendation[] = availablePaths.map((path) => {
        const score = this.calculateRecommendationScore(path, employee.skills);
        const matchingSkills = path.skills.filter((skill) => employee.skills.includes(skill));

        const reasons = this.generateRecommendationReasons(path, matchingSkills, employee);
        const difficulty = this.assessDifficulty(path, employee.skills);

        return {
          path,
          score,
          reasons,
          matchingSkills,
          difficulty,
        };
      });

      // Sort by score and return top recommendations
      const sortedRecommendations = recommendations.sort((a, b) => b.score - a.score).slice(0, 10);

      logger.info('Generated learning path recommendations', {
        employeeId,
        totalRecommendations: sortedRecommendations.length,
      });

      return sortedRecommendations;
    } catch (error) {
      logger.error('Error getting recommended learning paths', error as Error);
      throw error;
    }
  }

  /**
   * Get employee skills (placeholder - would integrate with employee service)
   */
  private async getEmployeeSkills(employeeId: string): Promise<{ skills: string[] }> {
    // Placeholder implementation
    // In a real application, this would fetch from employee service or user profile
    return { skills: [] };
  }

  /**
   * Calculate recommendation score
   */
  private calculateRecommendationScore(
    path: LearningPath & { _count: { enrollments: number } },
    employeeSkills: string[]
  ): number {
    let score = 50; // Base score

    // Skill matching (higher weight)
    const matchingSkills = path.skills.filter((skill) => employeeSkills.includes(skill));
    score += matchingSkills.length * 20;

    // Popularity factor
    score += Math.min(path._count.enrollments * 2, 20);

    // Level appropriateness (prefer beginner for new employees)
    if (path.level === 'BEGINNER') score += 10;
    if (path.level === 'INTERMEDIATE') score += 5;

    // Recent activity bonus
    const daysSinceCreated = Math.floor(
      (Date.now() - path.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreated < 90) score += 15; // Recent paths get bonus

    return Math.min(score, 100);
  }

  /**
   * Generate recommendation reasons
   */
  private generateRecommendationReasons(
    path: LearningPath,
    matchingSkills: string[],
    employee: { skills: string[] }
  ): string[] {
    const reasons: string[] = [];

    if (matchingSkills.length > 0) {
      reasons.push(`Matches ${matchingSkills.length} of your skills: ${matchingSkills.join(', ')}`);
    }

    if (path.level === 'BEGINNER') {
      reasons.push('Great for building foundational knowledge');
    } else if (path.level === 'ADVANCED') {
      reasons.push('Perfect for advancing your expertise');
    }

    if (path.estimatedDuration <= 40) {
      reasons.push('Can be completed quickly');
    }

    if (path.category) {
      reasons.push(`Enhance your ${path.category.toLowerCase()} skills`);
    }

    return reasons;
  }

  /**
   * Assess difficulty relative to employee
   */
  private assessDifficulty(
    path: LearningPath,
    employeeSkills: string[]
  ): 'EASY' | 'MODERATE' | 'CHALLENGING' {
    const matchingSkills = path.skills.filter((skill) => employeeSkills.includes(skill));
    const skillMatch = matchingSkills.length / Math.max(path.skills.length, 1);

    if (path.level === 'BEGINNER' || skillMatch > 0.7) {
      return 'EASY';
    } else if (path.level === 'INTERMEDIATE' || skillMatch > 0.3) {
      return 'MODERATE';
    } else {
      return 'CHALLENGING';
    }
  }

  /**
   * Clone a learning path
   */
  async cloneLearningPath(id: string, newTitle: string, userId: string): Promise<LearningPath> {
    try {
      logger.info('Cloning learning path', {
        pathId: id,
        newTitle,
        userId,
      });

      const originalPath = await this.prisma.learningPath.findUnique({
        where: { id },
      });

      if (!originalPath) {
        throw new Error('Original learning path not found');
      }

      const clonedPath = await this.prisma.learningPath.create({
        data: {
          title: newTitle,
          description: `Copy of ${originalPath.description || originalPath.title}`,
          category: originalPath.category,
          level: originalPath.level,
          estimatedDuration: originalPath.estimatedDuration,
          estimatedHours: originalPath.estimatedHours, // Add required field
          courseIds: originalPath.courseIds,
          courses: originalPath.courses as any, // Copy courses JSON data
          prerequisites: originalPath.prerequisites,
          skills: originalPath.skills,
          isPublished: false, // Cloned paths start as inactive
          tags: originalPath.tags,
          authorId: userId,
        },
        include: {
          // courses: true, // Courses relation not available in current schema
        },
      });

      logger.info('Learning path cloned successfully', {
        originalId: id,
        clonedId: clonedPath.id,
        newTitle,
      });

      return clonedPath;
    } catch (error) {
      logger.error('Error cloning learning path', error as Error);
      throw error;
    }
  }
}
