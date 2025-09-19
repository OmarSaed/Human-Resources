import { PrismaClient, PerformanceReview, Prisma } from '@prisma/client';
import { PerformanceReviewSearchParams } from '../types/performance.types';
import { PaginationParams, PaginationResult } from '../models/shared.models';

// Simple logger fallback
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error),
  debug: (message: string, data?: any) => console.log(`[DEBUG] ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
};

// Local type definitions

export class PerformanceReviewRepository {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get model() {
    return this.prismaClient.performanceReview;
  }

  /**
   * Create a new performance review
   */
  async create(data: Omit<PerformanceReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<PerformanceReview> {
    try {
      return await this.model.create({
        data: {
          employeeId: data.employeeId,
          reviewerId: data.reviewerId,
          reviewPeriod: data.reviewPeriod,
          reviewType: data.reviewType,
          overallRating: data.overallRating,
          goals: data.goals as Prisma.InputJsonValue,
          strengths: data.strengths,
          areasForImprovement: data.areasForImprovement,
          developmentPlan: data.developmentPlan,
          managerComments: data.managerComments,
          employeeComments: data.employeeComments,
          hrComments: data.hrComments,
          status: data.status,
          dueDate: data.dueDate,
          completedAt: data.completedAt,
          submittedAt: data.submittedAt,
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
          metadata: data.metadata as Prisma.InputJsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to create performance review', error as Error);
      throw error;
    }
  }

  /**
   * Find performance review by ID
   */
  async findById(id: string, options?: { include?: string[] }): Promise<PerformanceReview | null> {
    try {
      const include = options?.include ? this.buildInclude(options.include) : undefined;
      
      return await this.model.findUnique({
        where: { id },
        include,
      });
    } catch (error) {
      logger.error('Failed to find performance review by ID', error as Error);
      throw error;
    }
  }

  /**
   * Update performance review
   */
  async update(id: string, data: Partial<PerformanceReview>): Promise<PerformanceReview> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only include defined fields
      if (data.reviewerId !== undefined) updateData.reviewerId = data.reviewerId;
      if (data.reviewPeriod !== undefined) updateData.reviewPeriod = data.reviewPeriod;
      if (data.reviewType !== undefined) updateData.reviewType = data.reviewType;
      if (data.overallRating !== undefined) updateData.overallRating = data.overallRating;
      if (data.goals !== undefined) updateData.goals = data.goals as Prisma.InputJsonValue;
      if (data.strengths !== undefined) updateData.strengths = data.strengths;
      if (data.areasForImprovement !== undefined) updateData.areasForImprovement = data.areasForImprovement;
      if (data.developmentPlan !== undefined) updateData.developmentPlan = data.developmentPlan;
      if (data.managerComments !== undefined) updateData.managerComments = data.managerComments;
      if (data.employeeComments !== undefined) updateData.employeeComments = data.employeeComments;
      if (data.hrComments !== undefined) updateData.hrComments = data.hrComments;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
      if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
      if (data.submittedAt !== undefined) updateData.submittedAt = data.submittedAt;
      if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt;
      if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;
      if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;

      return await this.model.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Failed to update performance review', error as Error);
      throw error;
    }
  }

  /**
   * Soft delete performance review
   */
  async softDelete(id: string): Promise<PerformanceReview> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to soft delete performance review', error as Error);
      throw error;
    }
  }

  /**
   * Find reviews by employee
   */
  async findByEmployee(employeeId: string): Promise<PerformanceReview[]> {
    try {
      return await this.model.findMany({
        where: { 
          employeeId,
          deletedAt: null,
        },
        include: {
          goals_relation: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          },
          reviewFeedback: {
            where: { status: 'SUBMITTED' },
            orderBy: { submittedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to find reviews by employee', error as Error);
      throw error;
    }
  }

  /**
   * Find reviews by reviewer
   */
  async findByReviewer(reviewerId: string): Promise<PerformanceReview[]> {
    try {
      return await this.model.findMany({
        where: { 
          reviewerId,
          deletedAt: null,
        },
        include: {
          goals_relation: {
            where: { deletedAt: null },
          },
          reviewFeedback: {
            where: { status: 'SUBMITTED' },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to find reviews by reviewer', error as Error);
      throw error;
    }
  }

  /**
   * Search performance reviews
   */
  async searchReviews(
    params: PerformanceReviewSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<PerformanceReview>> {
    try {
      const where = this.buildSearchWhere(params);
      const orderBy = this.buildSearchOrderBy(params, pagination);

      const [reviews, total] = await Promise.all([
        this.model.findMany({
          where,
          include: {
            goals_relation: {
              where: { deletedAt: null },
              select: {
                id: true,
                title: true,
                status: true,
                progress: true,
              },
            },
            reviewFeedback: {
              where: { status: 'SUBMITTED' },
              select: {
                id: true,
                feedbackType: true,
                rating: true,
              },
            },
          },
          orderBy,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        this.model.count({ where }),
      ]);

      return this.buildPaginationResult(reviews, total, pagination);
    } catch (error) {
      logger.error('Failed to search performance reviews', error as Error);
      throw error;
    }
  }

  /**
   * Get reviews due soon
   */
  async getReviewsDueSoon(days: number = 7): Promise<PerformanceReview[]> {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      return await this.model.findMany({
        where: {
          dueDate: {
            lte: dueDate,
          },
          status: {
            in: ['DRAFT', 'IN_PROGRESS', 'EMPLOYEE_REVIEW', 'MANAGER_REVIEW'],
          },
          deletedAt: null,
        },
        include: {
          goals_relation: {
            where: { deletedAt: null },
            select: {
              id: true,
              title: true,
              status: true,
              progress: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get reviews due soon', error as Error);
      throw error;
    }
  }

  /**
   * Get overdue reviews
   */
  async getOverdueReviews(): Promise<PerformanceReview[]> {
    try {
      const today = new Date();

      return await this.model.findMany({
        where: {
          dueDate: {
            lt: today,
          },
          status: {
            in: ['DRAFT', 'IN_PROGRESS', 'EMPLOYEE_REVIEW', 'MANAGER_REVIEW'],
          },
          deletedAt: null,
        },
        include: {
          goals_relation: {
            where: { deletedAt: null },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get overdue reviews', error as Error);
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats(employeeId?: string): Promise<{
    totalReviews: number;
    completedReviews: number;
    averageRating: number;
    onTimeCompletion: number;
    overdue: number;
  }> {
    try {
      const where: any = {
        deletedAt: null,
      };

      if (employeeId) {
        where.employeeId = employeeId;
      }

      const [totalReviews, completedReviews, avgRatingResult, onTimeResult, overdueResult] = await Promise.all([
        this.model.count({ where }),
        this.model.count({ 
          where: { 
            ...where, 
            status: { in: ['COMPLETED', 'APPROVED'] } 
          } 
        }),
        this.model.aggregate({
          where: { 
            ...where, 
            overallRating: { not: null } 
          },
          _avg: { overallRating: true },
        }),
        this.model.count({
          where: {
            ...where,
            status: { in: ['COMPLETED', 'APPROVED'] },
            completedAt: { lte: this.model.fields.dueDate },
          },
        }),
        this.model.count({
          where: {
            ...where,
            dueDate: { lt: new Date() },
            status: { in: ['DRAFT', 'IN_PROGRESS', 'EMPLOYEE_REVIEW', 'MANAGER_REVIEW'] },
          },
        }),
      ]);

      return {
        totalReviews,
        completedReviews,
        averageRating: avgRatingResult._avg.overallRating || 0,
        onTimeCompletion: onTimeResult,
        overdue: overdueResult,
      };
    } catch (error) {
      logger.error('Failed to get review statistics', error as Error);
      throw error;
    }
  }

  /**
   * Build pagination result
   */
  private buildPaginationResult<T>(data: T[], total: number, pagination: PaginationParams): PaginationResult<T> {
    const totalPages = Math.ceil(total / pagination.limit);
    
    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    };
  }

  /**
   * Build include clause
   */
  private buildInclude(include: string[]): any {
    const includeObj: any = {};
    
    for (const field of include) {
      switch (field) {
        case 'goals':
          includeObj.goals_relation = {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          };
          break;
        case 'feedback':
          includeObj.reviewFeedback = {
            where: { status: 'SUBMITTED' },
            orderBy: { submittedAt: 'desc' },
          };
          break;
        default:
          includeObj[field] = true;
      }
    }
    
    return includeObj;
  }

  /**
   * Build search where clause
   */
  private buildSearchWhere(params: PerformanceReviewSearchParams): Prisma.PerformanceReviewWhereInput {
    const where: Prisma.PerformanceReviewWhereInput = {
      deletedAt: null,
    };

    if (params.employeeId) {
      where.employeeId = params.employeeId;
    }

    if (params.reviewerId) {
      where.reviewerId = params.reviewerId;
    }

    if (params.reviewType) {
      where.reviewType = params.reviewType;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.reviewPeriod) {
      where.reviewPeriod = { contains: params.reviewPeriod, mode: 'insensitive' };
    }

    if (params.dueDateFrom || params.dueDateTo) {
      where.dueDate = {};
      if (params.dueDateFrom) {
        where.dueDate.gte = new Date(params.dueDateFrom);
      }
      if (params.dueDateTo) {
        where.dueDate.lte = new Date(params.dueDateTo);
      }
    }

    if (params.completedFrom || params.completedTo) {
      where.completedAt = {};
      if (params.completedFrom) {
        where.completedAt.gte = new Date(params.completedFrom);
      }
      if (params.completedTo) {
        where.completedAt.lte = new Date(params.completedTo);
      }
    }

    if (params.overallRatingMin !== undefined || params.overallRatingMax !== undefined) {
      where.overallRating = {};
      if (params.overallRatingMin !== undefined) {
        where.overallRating.gte = params.overallRatingMin;
      }
      if (params.overallRatingMax !== undefined) {
        where.overallRating.lte = params.overallRatingMax;
      }
    }

    return where;
  }

  /**
   * Build search order by clause
   */
  private buildSearchOrderBy(
    params: PerformanceReviewSearchParams, 
    pagination: PaginationParams
  ): Prisma.PerformanceReviewOrderByWithRelationInput {
    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'desc';

    switch (sortBy) {
      case 'dueDate':
      case 'completedAt':
      case 'overallRating':
      case 'reviewType':
      case 'status':
        return { [sortBy]: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }
}
