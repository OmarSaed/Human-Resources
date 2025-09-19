import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('goal-service');

export interface GoalData {
  title: string;
  description: string;
  category: 'PERFORMANCE' | 'DEVELOPMENT' | 'CAREER' | 'PROJECT' | 'PERSONAL' | 'TEAM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetDate: Date;
  employeeId: string;
  createdBy: string;
  metrics?: KeyResult[];
  tags?: string[];
  isPublic?: boolean;
  weight?: number; // Importance weight (1-10)
}

export interface KeyResult {
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string; // e.g., 'percentage', 'number', 'currency'
  isComplete: boolean;
}

export interface GoalProgress {
  progress: number; // 0-100
  notes?: string;
  milestones?: string[];
  updatedBy: string;
}

export interface GoalComment {
  content: string;
  authorId: string;
  isPrivate: boolean;
}

export interface ListGoalsOptions {
  employeeId?: string;
  status?: string;
  category?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GoalStatistics {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  overdueGoals: number;
  averageProgress: number;
  completionRate: number;
  goalsByCategory: Record<string, number>;
  goalsByPriority: Record<string, number>;
  upcomingDeadlines: any[];
}

export class GoalService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new goal
   */
  async createGoal(data: GoalData & { createdBy: string }): Promise<any> {
    try {
      const goal = await this.prisma.goal.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          targetDate: data.targetDate,
          employeeId: data.employeeId,
          metrics: data.metrics ? JSON.stringify(data.metrics) : undefined,
          weight: data.weight || 5,
          status: 'NOT_STARTED',
          progress: 0,
          createdBy: data.createdBy,
        },
        include: {
          milestones: true,
          updates: true,
        },
      });

      logger.info('Goal created successfully', {
        goalId: goal.id,
        title: goal.title,
        employeeId: goal.employeeId,
        createdBy: data.createdBy,
      });

      return {
        ...goal,
        metrics: goal.metrics ? JSON.parse(goal.metrics as string) : [],
      };
    } catch (error) {
      logger.error('Failed to create goal', error as Error);
      throw error;
    }
  }

  /**
   * Get goal by ID
   */
  async getGoal(goalId: string, requestingUserId: string): Promise<any | null> {
    try {
      const goal = await this.prisma.goal.findUnique({
        where: { id: goalId },
        include: {
          milestones: true,
          updates: true,
        },
      });

      if (!goal) {
        return null;
      }

      // Check access permissions
      const hasAccess = goal.employeeId === requestingUserId;

      if (!hasAccess) {
        throw new Error('Access denied');
      }

      return {
        ...goal,
        metrics: goal.metrics ? JSON.parse(goal.metrics as string) : [],
      };
    } catch (error) {
      logger.error(`Failed to get goal ${goalId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update goal
   */
  async updateGoal(goalId: string, updates: Partial<GoalData>, requestingUserId: string): Promise<any> {
    try {
      // Check permissions
      const goal = await this.prisma.goal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        throw new Error('Goal not found');
      }

      const canEdit =  goal.employeeId === requestingUserId;;

      if (!canEdit) {
        throw new Error('You do not have permission to edit this goal');
      }

      const updateData: any = { ...updates };
      if (updates.metrics) {
        updateData.metrics = JSON.stringify(updates.metrics);
      }

      const updatedGoal = await this.prisma.goal.update({
        where: { id: goalId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        }
      });

      logger.info('Goal updated successfully', {
        goalId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return {
        ...updatedGoal,
        metrics: updatedGoal.metrics ? JSON.parse(updatedGoal.metrics as string) : [],
      };
    } catch (error) {
      logger.error(`Failed to update goal ${goalId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete goal
   */
  async deleteGoal(goalId: string, requestingUserId: string): Promise<void> {
    try {
      const goal = await this.prisma.goal.findUnique({
        where: { id: goalId },
        include: {
          milestones: true,
        },
      });

      if (!goal) {
        throw new Error('Goal not found');
      }

      const canDelete = 
        goal.employeeId === requestingUserId;

      if (!canDelete) {
        throw new Error('You do not have permission to delete this goal');
      }

      await this.prisma.goal.delete({
        where: { id: goalId },
      });

      logger.info('Goal deleted successfully', { goalId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete goal ${goalId}`, error as Error);
      throw error;
    }
  }

  /**
   * List goals with filtering and pagination
   */
  async listGoals(options: ListGoalsOptions): Promise<{
    goals: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        employeeId,
        status,
        category,
        priority,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
        requestingUserId,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {
        employeeId: requestingUserId,
      };

      if (employeeId) where.employeeId = employeeId;
      if (status) where.status = status;
      if (category) where.category = category;
      if (priority) where.priority = priority;

      if (startDate || endDate) {
        where.targetDate = {};
        if (startDate) where.targetDate.gte = startDate;
        if (endDate) where.targetDate.lte = endDate;
      }

      const [goals, total] = await Promise.all([
        this.prisma.goal.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                milestones: true,
                updates: true,
              },
            },
          },
        }),
        this.prisma.goal.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      const processedGoals = goals.map(goal => ({
        ...goal,
        metrics: goal.metrics ? JSON.parse(goal.metrics as string) : [],
      }));

      return {
        goals: processedGoals,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list goals', error as Error);
      throw error;
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: string, progressData: GoalProgress): Promise<any> {
    try {
      const goal = await this.prisma.goal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        throw new Error('Goal not found');
      }

      // Determine new status based on progress
      let newStatus = goal.status;
      if (progressData.progress > 0 && goal.status === 'NOT_STARTED') {
        newStatus = 'IN_PROGRESS';
      } else if (progressData.progress >= 100) {
        newStatus = 'COMPLETED';
      }

      const updatedGoal = await this.prisma.goal.update({
        where: { id: goalId },
        data: {
          progress: progressData.progress,
          status: newStatus,
          notes: progressData.notes,
          achievedDate: new Date(),
          updatedAt: new Date(),
        },
        include: {
          milestones: true,
          updates: true,
        },
      });

      logger.info('Goal progress updated', {
        goalId,
        progress: progressData.progress,
        status: newStatus,
        updatedBy: progressData.updatedBy,
      });

      return {
        ...updatedGoal,
        metrics: updatedGoal.metrics ? JSON.parse(updatedGoal.metrics as string) : [],
      };
    } catch (error) {
      logger.error(`Failed to update goal progress ${goalId}`, error as Error);
      throw error;
    }
  }

  /**
   * Complete goal
   */
  async completeGoal(
    goalId: string, 
    userId: string, 
    completionData: { completionNotes?: string; actualEndDate?: Date }
  ): Promise<any> {
    try {
      const updatedGoal = await this.prisma.goal.update({
        where: { id: goalId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          achievedDate: completionData.actualEndDate || new Date(),
          notes: completionData.completionNotes,
          updatedAt: new Date(),
        }
      });


      logger.info('Goal completed', { goalId, userId });

      return {
        ...updatedGoal,
        metrics: updatedGoal.metrics ? JSON.parse(updatedGoal.metrics as string) : [],
      };
    } catch (error) {
      logger.error(`Failed to complete goal ${goalId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get goal statistics
   */
  async getGoalStatistics(
    employeeId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      requestingUserId: string;
    }
  ): Promise<GoalStatistics> {
    try {
      const { startDate, endDate, requestingUserId } = options;

      // Check access permissions
      if (employeeId !== requestingUserId) {
        // Check if requesting user is manager or has access
        const hasAccess = await this.checkManagerAccess(requestingUserId, employeeId);
        if (!hasAccess) {
          throw new Error('Access denied');
        }
      }

      const where: any = { employeeId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalGoals,
        completedGoals,
        inProgressGoals,
        overdueGoals,
        avgProgress,
        goalsByCategory,
        goalsByPriority,
        upcomingDeadlines,
      ] = await Promise.all([
        this.prisma.goal.count({ where }),
        this.prisma.goal.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.goal.count({ where: { ...where, status: 'IN_PROGRESS' } }),
        this.prisma.goal.count({
          where: {
            ...where,
            targetDate: { lt: new Date() },
            status: { not: 'COMPLETED' },
          },
        }),
        this.prisma.goal.aggregate({
          where,
          _avg: { progress: true },
        }),
        this.prisma.goal.groupBy({
          by: ['category'],
          where,
          _count: { category: true },
        }),
        this.prisma.goal.groupBy({
          by: ['priority'],
          where,
          _count: { priority: true },
        }),
        this.prisma.goal.findMany({
          where: {
            ...where,
            targetDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
            },
            status: { not: 'COMPLETED' },
          },
          orderBy: { targetDate: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            targetDate: true,
            priority: true,
            progress: true,
          },
        }),
      ]);

      const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

      const categoryCounts: Record<string, number> = {};
      goalsByCategory.forEach(item => {
        categoryCounts[item.category] = item._count.category;
      });

      const priorityCounts: Record<string, number> = {};
      goalsByPriority.forEach(item => {
        priorityCounts[item.priority] = item._count.priority;
      });

      return {
        totalGoals,
        completedGoals,
        inProgressGoals,
        overdueGoals,
        averageProgress: avgProgress._avg.progress || 0,
        completionRate,
        goalsByCategory: categoryCounts,
        goalsByPriority: priorityCounts,
        upcomingDeadlines,
      };
    } catch (error) {
      logger.error(`Failed to get goal statistics for employee ${employeeId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get team goals overview
   */
  async getTeamGoalsOverview(options: {
    departmentId?: string;
    page: number;
    limit: number;
    managerId: string;
  }): Promise<{
    teamGoals: any[];
    total: number;
    page: number;
    totalPages: number;
    summary: any;
  }> {
    try {
      const { departmentId, page, limit, managerId } = options;
      const skip = (page - 1) * limit;

      const where: any = {
        OR: [
          { managerId },
          { employee: { managerId } },
        ],
      };

      if (departmentId) {
        where.employee = { departmentId };
      }

      const [goals, total] = await Promise.all([
        this.prisma.goal.findMany({
          where,
          skip,
          take: limit,
          orderBy: { targetDate: 'asc' },
          include: {
            _count: {
              select: {
                milestones: true,
                updates: true,
              },
            },
          },
        }),
        this.prisma.goal.count({ where }),
      ]);

      // Get summary statistics
      const summary = await this.prisma.goal.aggregate({
        where,
        _avg: { progress: true },
        _count: {
          _all: true,
        },
      });

      const statusCounts = await this.prisma.goal.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      });

      const totalPages = Math.ceil(total / limit);

      const processedGoals = goals.map(goal => ({
        ...goal,
        metrics: goal.metrics ? JSON.parse(goal.metrics as string) : [],
      }));

      return {
        teamGoals: processedGoals,
        total,
        page,
        totalPages,
        summary: {
          totalGoals: summary._count._all,
          averageProgress: summary._avg.progress || 0,
          statusBreakdown: statusCounts.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    } catch (error) {
      logger.error('Failed to get team goals overview', error as Error);
      throw error;
    }
  }

  /**
   * Add comment to goal
   */
  async addGoalComment(goalId: string, commentData: GoalComment): Promise<any> {
    // TODO: Implement goal comments - requires goalComment model in schema
    throw new Error('Goal comments not implemented - goalComment model not found in schema');
  }

  /**
   * Get goal comments
   */
  async getGoalComments(
    goalId: string,
    options: {
      page: number;
      limit: number;
      requestingUserId: string;
    }
  ): Promise<{
    comments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // TODO: Implement goal comments - requires goalComment model in schema
    return {
      comments: [],
      total: 0,
      page: options.page,
      totalPages: 0,
    };
  }

  /**
   * Align goals (create parent-child relationships)
   */
  async alignGoals(
    goalId: string,
    alignmentData: {
      parentGoalId?: string;
      childGoalIds?: string[];
      alignmentType: 'supports' | 'contributes_to' | 'depends_on';
      alignedBy: string;
    }
  ): Promise<any> {
    // TODO: Implement goal alignment - requires parentGoalId field and goalAlignment model in schema
    throw new Error('Goal alignment not implemented - parentGoalId field and goalAlignment model not found in schema');
  }

  /**
   * Check if user has manager access to employee
   */
  private async checkManagerAccess(managerId: string, employeeId: string): Promise<boolean> {
    // TODO: Implement manager access check - requires integration with employee-service
    // For now, return true to allow operations
    return true;
  }
}
