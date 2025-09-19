import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('development-plan-service');

export interface DevelopmentPlanData {
  title: string;
  description?: string;
  employeeId: string;
  managerId: string;
  reviewId?: string;
  objectives: any[];
  skills?: any[];
  resources?: any[];
  timeline?: any;
  budget?: number;
  startDate: Date;
  endDate: Date;
}

export interface DevelopmentActivityData {
  title: string;
  description?: string;
  type: 'TRAINING' | 'WORKSHOP' | 'COURSE' | 'CERTIFICATION' | 'MENTORING' | 'COACHING' | 'CONFERENCE' | 'READING' | 'PROJECT' | 'OTHER';
  provider?: string;
  cost?: number;
  duration?: number;
  startDate: Date;
  endDate?: Date;
}

export interface ListDevelopmentPlansOptions {
  employeeId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface DevelopmentPlanStatistics {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  averageProgress: number;
  totalBudget: number;
  spentBudget: number;
  plansByStatus: Record<string, number>;
  upcomingDeadlines: any[];
}

export class DevelopmentPlanService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new development plan
   */
  async createDevelopmentPlan(data: DevelopmentPlanData): Promise<any> {
    try {
      const plan = await this.prisma.developmentPlan.create({
        data: {
          title: data.title,
          description: data.description,
          employeeId: data.employeeId,
          managerId: data.managerId,
          reviewId: data.reviewId,
          objectives: data.objectives,
          skills: data.skills || [],
          resources: data.resources || [],
          timeline: data.timeline,
          budget: data.budget,
          startDate: data.startDate,
          endDate: data.endDate,
          status: 'DRAFT',
          progress: 0,
        },
        include: {
          activities: {
            orderBy: { startDate: 'asc' },
          },
        },
      });

      logger.info('Development plan created successfully', {
        planId: plan.id,
        title: plan.title,
        employeeId: plan.employeeId,
      });

      return plan;
    } catch (error) {
      logger.error('Failed to create development plan', error as Error);
      throw error;
    }
  }

  /**
   * Get development plan by ID
   */
  async getDevelopmentPlan(planId: string, requestingUserId: string): Promise<any | null> {
    try {
      const plan = await this.prisma.developmentPlan.findUnique({
        where: { id: planId },
        include: {
          activities: {
            orderBy: { startDate: 'asc' },
          },
        },
      });

      if (!plan) {
        return null;
      }

      // Check access permissions
      const hasAccess = 
        plan.employeeId === requestingUserId ||
        plan.managerId === requestingUserId;

      if (!hasAccess) {
        throw new Error('Access denied');
      }

      return plan;
    } catch (error) {
      logger.error(`Failed to get development plan ${planId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update development plan
   */
  async updateDevelopmentPlan(
    planId: string, 
    updates: Partial<DevelopmentPlanData>, 
    requestingUserId: string
  ): Promise<any> {
    try {
      // Check permissions
      const plan = await this.prisma.developmentPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error('Development plan not found');
      }

      const canEdit = 
        plan.employeeId === requestingUserId ||
        plan.managerId === requestingUserId;

      if (!canEdit) {
        throw new Error('You do not have permission to edit this development plan');
      }

      const updatedPlan = await this.prisma.developmentPlan.update({
        where: { id: planId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          activities: {
            orderBy: { startDate: 'asc' },
          },
        },
      });

      logger.info('Development plan updated successfully', {
        planId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedPlan;
    } catch (error) {
      logger.error(`Failed to update development plan ${planId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete development plan
   */
  async deleteDevelopmentPlan(planId: string, requestingUserId: string): Promise<void> {
    try {
      const plan = await this.prisma.developmentPlan.findUnique({
        where: { id: planId },
        include: {
          activities: true,
        },
      });

      if (!plan) {
        throw new Error('Development plan not found');
      }

      const canDelete = 
        plan.employeeId === requestingUserId ||
        plan.managerId === requestingUserId;

      if (!canDelete) {
        throw new Error('You do not have permission to delete this development plan');
      }

      // Check if plan has active activities
      const activeActivities = plan.activities.filter(activity => 
        activity.status === 'IN_PROGRESS'
      );

      if (activeActivities.length > 0) {
        throw new Error('Cannot delete development plan with active activities. Please complete or cancel activities first.');
      }

      await this.prisma.developmentPlan.delete({
        where: { id: planId },
      });

      logger.info('Development plan deleted successfully', { planId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete development plan ${planId}`, error as Error);
      throw error;
    }
  }

  /**
   * List development plans with filtering and pagination
   */
  async listDevelopmentPlans(options: ListDevelopmentPlansOptions): Promise<{
    developmentPlans: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        employeeId,
        status,
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
        OR: [
          { employeeId: requestingUserId },
          { managerId: requestingUserId },
        ],
      };

      if (employeeId) where.employeeId = employeeId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate.gte = startDate;
        if (endDate) where.startDate.lte = endDate;
      }

      const [plans, total] = await Promise.all([
        this.prisma.developmentPlan.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            activities: {
              select: {
                id: true,
                title: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
            _count: {
              select: {
                activities: true,
              },
            },
          },
        }),
        this.prisma.developmentPlan.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        developmentPlans: plans,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list development plans', error as Error);
      throw error;
    }
  }

  /**
   * Update development plan progress
   */
  async updatePlanProgress(
    planId: string, 
    progressData: { progress: number; notes?: string; updatedBy: string }
  ): Promise<any> {
    try {
      const plan = await this.prisma.developmentPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error('Development plan not found');
      }

      // Determine new status based on progress
      let newStatus = plan.status;
      if (progressData.progress > 0 && plan.status === 'DRAFT') {
        newStatus = 'ACTIVE';
      } else if (progressData.progress >= 100) {
        newStatus = 'COMPLETED';
      }

      const updatedPlan = await this.prisma.developmentPlan.update({
        where: { id: planId },
        data: {
          progress: progressData.progress,
          status: newStatus,
          notes: progressData.notes,
          completedAt: progressData.progress >= 100 ? new Date() : null,
          updatedAt: new Date(),
        },
        include: {
          activities: {
            orderBy: { startDate: 'asc' },
          },
        },
      });

      logger.info('Development plan progress updated', {
        planId,
        progress: progressData.progress,
        status: newStatus,
        updatedBy: progressData.updatedBy,
      });

      return updatedPlan;
    } catch (error) {
      logger.error(`Failed to update development plan progress ${planId}`, error as Error);
      throw error;
    }
  }

  /**
   * Add activity to development plan
   */
  async addActivity(
    planId: string, 
    activityData: DevelopmentActivityData, 
    requestingUserId: string
  ): Promise<any> {
    try {
      // Check permissions
      const plan = await this.prisma.developmentPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error('Development plan not found');
      }

      const canEdit = 
        plan.employeeId === requestingUserId ||
        plan.managerId === requestingUserId;

      if (!canEdit) {
        throw new Error('You do not have permission to add activities to this development plan');
      }

      const activity = await this.prisma.developmentActivity.create({
        data: {
          planId,
          title: activityData.title,
          description: activityData.description,
          type: activityData.type,
          provider: activityData.provider,
          cost: activityData.cost,
          duration: activityData.duration,
          startDate: activityData.startDate,
          endDate: activityData.endDate,
          status: 'PLANNED',
          completionRate: 0,
        },
      });

      logger.info('Development activity added', {
        planId,
        activityId: activity.id,
        title: activity.title,
        requestingUserId,
      });

      return activity;
    } catch (error) {
      logger.error(`Failed to add development activity for plan ${planId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update activity
   */
  async updateActivity(
    planId: string,
    activityId: string,
    updates: Partial<DevelopmentActivityData>,
    requestingUserId: string
  ): Promise<any> {
    try {
      // Check permissions
      const plan = await this.prisma.developmentPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error('Development plan not found');
      }

      const canEdit = 
        plan.employeeId === requestingUserId ||
        plan.managerId === requestingUserId;

      if (!canEdit) {
        throw new Error('You do not have permission to update this activity');
      }

      const activity = await this.prisma.developmentActivity.update({
        where: { id: activityId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      logger.info('Development activity updated', { planId, activityId, requestingUserId });

      return activity;
    } catch (error) {
      logger.error(`Failed to update development activity ${activityId} for plan ${planId}`, error as Error);
      throw error;
    }
  }

  /**
   * Complete activity
   */
  async completeActivity(
    planId: string,
    activityId: string,
    completionData: {
      feedback?: string;
      rating?: number;
      certificateUrl?: string;
      completedBy: string;
    }
  ): Promise<any> {
    try {
      const activity = await this.prisma.developmentActivity.update({
        where: { id: activityId },
        data: {
          status: 'COMPLETED',
          completionRate: 100,
          feedback: completionData.feedback,
          rating: completionData.rating,
          certificateUrl: completionData.certificateUrl,
          endDate: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update overall plan progress
      await this.updatePlanProgressFromActivities(planId);

      logger.info('Development activity completed', {
        planId,
        activityId,
        rating: completionData.rating,
        completedBy: completionData.completedBy,
      });

      return activity;
    } catch (error) {
      logger.error(`Failed to complete development activity ${activityId} for plan ${planId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update plan progress based on activities
   */
  private async updatePlanProgressFromActivities(planId: string): Promise<void> {
    try {
      const plan = await this.prisma.developmentPlan.findUnique({
        where: { id: planId },
        include: {
          activities: true,
        },
      });

      if (!plan || !plan.activities.length) {
        return;
      }

      // Calculate overall progress
      const totalActivities = plan.activities.length;
      const completedActivities = plan.activities.filter(
        activity => activity.status === 'COMPLETED'
      ).length;

      const progress = Math.round((completedActivities / totalActivities) * 100);

      await this.prisma.developmentPlan.update({
        where: { id: planId },
        data: {
          progress,
          status: progress >= 100 ? 'COMPLETED' : 'ACTIVE',
          completedAt: progress >= 100 ? new Date() : null,
        },
      });
    } catch (error) {
      logger.error(`Failed to update plan progress from activities ${planId}`, error as Error);
    }
  }

  /**
   * Get development plan statistics
   */
  async getDevelopmentPlanStatistics(
    employeeId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      requestingUserId: string;
    }
  ): Promise<DevelopmentPlanStatistics> {
    try {
      const { startDate, endDate, requestingUserId } = options;

      // Check access permissions
      if (employeeId !== requestingUserId) {
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
        totalPlans,
        activePlans,
        completedPlans,
        avgProgress,
        budgetStats,
        plansByStatus,
        upcomingDeadlines,
      ] = await Promise.all([
        this.prisma.developmentPlan.count({ where }),
        this.prisma.developmentPlan.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.developmentPlan.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.developmentPlan.aggregate({
          where,
          _avg: { progress: true },
        }),
        this.prisma.developmentPlan.aggregate({
          where,
          _sum: { budget: true },
        }),
        this.prisma.developmentPlan.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        this.prisma.developmentPlan.findMany({
          where: {
            ...where,
            endDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
            },
            status: { not: 'COMPLETED' },
          },
          orderBy: { endDate: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            endDate: true,
            progress: true,
          },
        }),
      ]);

      // Calculate spent budget from completed activities
      const spentBudgetResult = await this.prisma.developmentActivity.aggregate({
        where: {
          plan: { employeeId },
          status: 'COMPLETED',
        },
        _sum: { cost: true },
      });

      const statusCounts: Record<string, number> = {};
      plansByStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
      });

      return {
        totalPlans,
        activePlans,
        completedPlans,
        averageProgress: avgProgress._avg.progress || 0,
        totalBudget: Number(budgetStats._sum.budget || 0),
        spentBudget: Number(spentBudgetResult._sum.cost || 0),
        plansByStatus: statusCounts,
        upcomingDeadlines,
      };
    } catch (error) {
      logger.error(`Failed to get development plan statistics for employee ${employeeId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get team development plans overview
   */
  async getTeamDevelopmentPlansOverview(options: {
    departmentId?: string;
    page: number;
    limit: number;
    managerId: string;
  }): Promise<{
    teamPlans: any[];
    total: number;
    page: number;
    totalPages: number;
    summary: any;
  }> {
    try {
      const { departmentId, page, limit, managerId } = options;
      const skip = (page - 1) * limit;

      const where: any = {
        managerId,
      };

      if (departmentId) {
        // This would need to be joined with employee data
        // For now, we'll keep it simple
      }

      const [plans, total] = await Promise.all([
        this.prisma.developmentPlan.findMany({
          where,
          skip,
          take: limit,
          orderBy: { endDate: 'asc' },
          include: {
            activities: {
              select: {
                id: true,
                title: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
            _count: {
              select: {
                activities: true,
              },
            },
          },
        }),
        this.prisma.developmentPlan.count({ where }),
      ]);

      // Get summary statistics
      const summary = await this.prisma.developmentPlan.aggregate({
        where,
        _avg: { progress: true },
        _sum: { budget: true },
        _count: { _all: true },
      });

      const statusCounts = await this.prisma.developmentPlan.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        teamPlans: plans,
        total,
        page,
        totalPages,
        summary: {
          totalPlans: summary._count._all,
          averageProgress: summary._avg.progress || 0,
          totalBudget: Number(summary._sum.budget || 0),
          statusBreakdown: statusCounts.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    } catch (error) {
      logger.error('Failed to get team development plans overview', error as Error);
      throw error;
    }
  }

  /**
   * Check if user has manager access to employee
   */
  private async checkManagerAccess(managerId: string, employeeId: string): Promise<boolean> {
    try {
      const plan = await this.prisma.developmentPlan.findFirst({
        where: {
          employeeId,
          managerId,
        },
      });

      return !!plan;
    } catch (error) {
      logger.error('Failed to check manager access', error as Error);
      return false;
    }
  }
}
