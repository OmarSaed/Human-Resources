import { PrismaClient } from '@prisma/client';
import { PerformanceReviewRepository } from '../repositories/performance-review.repository';
import { PaginationParams, PaginationResult } from '../models/shared.models';
import {
  PerformanceReviewCreateRequest,
  PerformanceReviewUpdateRequest,
  PerformanceReviewResponse,
  PerformanceReviewSearchParams,
  ReviewProgress,
} from '../types/performance.types';
import { AuditService, NotificationService } from '@hrms/shared';
import { ExternalService } from './external.service';

// Simple logger fallback
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] performance-review-service: ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] performance-review-service: ${message}`, error),
  debug: (message: string, data?: any) => console.log(`[DEBUG] performance-review-service: ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] performance-review-service: ${message}`, data),
};


// Mock event factory for now
const EventFactory = {
  publishEvent: async (eventType: string, data: any) => {
    logger.debug('Event published', { eventType, data });
  }
};

const SYSTEM_EVENT_TYPES = {
  AUDIT_LOG_CREATED: 'AUDIT_LOG_CREATED'
};

export class PerformanceReviewService {
  private reviewRepository: PerformanceReviewRepository;
  private auditService: AuditService;
  private notificationService: NotificationService;
  private externalService: ExternalService;

  constructor(
    prismaClient: PrismaClient,
    auditService: AuditService,
    notificationService: NotificationService,
    externalService: ExternalService
  ) {
    this.reviewRepository = new PerformanceReviewRepository(prismaClient);
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.externalService = externalService;
  }

  /**
   * Create a new performance review
   */
  async createPerformanceReview(
    data: PerformanceReviewCreateRequest, 
    createdBy: string
  ): Promise<PerformanceReviewResponse> {
    try {
      // Validate employee and reviewer exist
      await this.validateEmployeeAndReviewer(data.employeeId, data.reviewerId);

      // Check for existing review in the same period
      const existingReview = await this.checkExistingReview(data.employeeId, data.reviewPeriod);
      if (existingReview) {
        throw new Error(`Performance review already exists for employee ${data.employeeId} in period ${data.reviewPeriod}`);
      }

      // Create performance review
      const review = await this.reviewRepository.create({
        employeeId: data.employeeId,
        reviewerId: data.reviewerId,
        reviewPeriod: data.reviewPeriod,
        reviewType: data.reviewType,
        dueDate: new Date(data.dueDate),
        goals: data.goals as any,
        metadata: data.metadata as any,
        status: 'DRAFT',
        overallRating: null,
        strengths: null,
        areasForImprovement: null,
        developmentPlan: null,
        managerComments: null,
        employeeComments: null,
        hrComments: null,
        completedAt: null,
        submittedAt: null,
        approvedAt: null,
        approvedBy: null,
        deletedAt: null,
      });

      // Audit log
      await this.auditService.logCRUD(
        'performance_review',
        review.id,
        createdBy,
        'create',
        data
      );

      // Send notifications
      await this.notificationService.sendNotification({
        recipientId: review.employeeId,
        type: 'email',
        template: 'performance-review-created',
        subject: 'New Performance Review Created',
        data: {
          employeeId: review.employeeId,
          reviewerId: review.reviewerId,
          period: review.reviewPeriod,
          dueDate: review.dueDate
        },
        priority: 'normal'
      });

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: createdBy,
        action: 'PERFORMANCE_REVIEW_CREATED',
        resource: 'performance_review',
        resourceId: review.id,
        changes: { created: review },
      });

      logger.info('Performance review created successfully', {
        reviewId: review.id,
        employeeId: review.employeeId,
        reviewPeriod: review.reviewPeriod,
        createdBy,
      });

      return this.transformReviewResponse(review);
    } catch (error) {
      logger.error('Failed to create performance review', error as Error);
      throw error;
    }
  }

  /**
   * Get performance review by ID
   */
  async getPerformanceReviewById(id: string): Promise<PerformanceReviewResponse | null> {
    try {
      const review = await this.reviewRepository.findById(id, {
        include: ['goals', 'feedback'],
      });

      if (!review) {
        return null;
      }

      return this.transformReviewResponse(review);
    } catch (error) {
      logger.error('Failed to get performance review by ID', error as Error);
      throw error;
    }
  }

  /**
   * Update performance review
   */
  async updatePerformanceReview(
    id: string,
    data: PerformanceReviewUpdateRequest,
    updatedBy: string,
    reason?: string
  ): Promise<PerformanceReviewResponse> {
    try {
      const existingReview = await this.reviewRepository.findById(id);
      if (!existingReview) {
        throw new Error('Performance review not found');
      }

      // Validate reviewer if changing
      if (data.reviewerId) {
        await this.validateEmployeeAndReviewer(existingReview.employeeId, data.reviewerId);
      }

      // Validate status transitions
      if (data.status) {
        this.validateStatusTransition(existingReview.status, data.status);
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        goals: data.goals as any,
        metadata: data.metadata as any,
      };

      // Set completion timestamps based on status
      if (data.status === 'COMPLETED' && !existingReview.completedAt) {
        updateData.completedAt = new Date();
      }
      if (data.status === 'EMPLOYEE_REVIEW' && !existingReview.submittedAt) {
        updateData.submittedAt = new Date();
      }
      if (data.status === 'APPROVED' && !existingReview.approvedAt) {
        updateData.approvedAt = new Date();
        updateData.approvedBy = updatedBy;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Update review
      const updatedReview = await this.reviewRepository.update(id, updateData);

      // Audit log
      await this.auditService.logCRUD(
        'performance_review',
        id,
        updatedBy,
        'update',
        data,
        {
          reason,
          previousData: existingReview,
        }
      );

      // Send notifications for status changes
      if (data.status && data.status !== existingReview.status) {
        await this.notificationService.sendNotification({
          recipientId: updatedReview.employeeId,
          type: 'email',
          template: 'performance-review-status-updated',
          subject: `Performance Review Status Updated: ${data.status}`,
          data: {
            employeeId: updatedReview.employeeId,
            reviewerId: updatedReview.reviewerId,
            oldStatus: existingReview.status,
            newStatus: data.status,
            period: updatedReview.reviewPeriod
          },
          priority: 'normal'
        });
      }

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: updatedBy,
        action: 'PERFORMANCE_REVIEW_UPDATED',
        resource: 'performance_review',
        resourceId: id,
        changes: { 
          before: existingReview,
          after: data,
        },
      });

      logger.info('Performance review updated successfully', {
        reviewId: id,
        updatedBy,
        changes: Object.keys(data),
      });

      return this.transformReviewResponse(updatedReview);
    } catch (error) {
      logger.error('Failed to update performance review', error as Error);
      throw error;
    }
  }

  /**
   * Delete performance review (soft delete)
   */
  async deletePerformanceReview(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const review = await this.reviewRepository.findById(id);
      if (!review) {
        throw new Error('Performance review not found');
      }

      // Only allow deletion of draft reviews
      if (review.status !== 'DRAFT') {
        throw new Error('Cannot delete performance review that is not in draft status');
      }

      // Soft delete
      await this.reviewRepository.softDelete(id);

      // Audit log
      await this.auditService.logCRUD(
        'performance_review',
        id,
        deletedBy,
        'delete',
        undefined,
        { reason, deletedReview: review }
      );

      // Send notifications
      await this.notificationService.sendNotification({
        recipientId: review.employeeId,
        type: 'email',
        template: 'performance-review-deleted',
        subject: 'Performance Review Deleted',
        data: {
          employeeId: review.employeeId,
          reviewerId: review.reviewerId,
          period: review.reviewPeriod,
          deletedBy: deletedBy
        },
        priority: 'normal'
      });

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: deletedBy,
        action: 'PERFORMANCE_REVIEW_DELETED',
        resource: 'performance_review',
        resourceId: id,
        changes: { deleted: review, reason },
      });

      logger.info('Performance review deleted successfully', {
        reviewId: id,
        deletedBy,
        reason,
      });
    } catch (error) {
      logger.error('Failed to delete performance review', error as Error);
      throw error;
    }
  }

  /**
   * Search performance reviews
   */
  async searchPerformanceReviews(
    params: PerformanceReviewSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<PerformanceReviewResponse>> {
    try {
      const result = await this.reviewRepository.searchReviews(params, pagination);
      
      return {
        ...result,
        data: result.data.map(review => this.transformReviewResponse(review)),
      };
    } catch (error) {
      logger.error('Failed to search performance reviews', error as Error);
      throw error;
    }
  }

  /**
   * Get reviews by employee
   */
  async getReviewsByEmployee(employeeId: string): Promise<PerformanceReviewResponse[]> {
    try {
      const reviews = await this.reviewRepository.findByEmployee(employeeId);
      return reviews.map(review => this.transformReviewResponse(review));
    } catch (error) {
      logger.error('Failed to get reviews by employee', error as Error);
      throw error;
    }
  }

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(reviewerId: string): Promise<PerformanceReviewResponse[]> {
    try {
      const reviews = await this.reviewRepository.findByReviewer(reviewerId);
      return reviews.map(review => this.transformReviewResponse(review));
    } catch (error) {
      logger.error('Failed to get reviews by reviewer', error as Error);
      throw error;
    }
  }

  /**
   * Get reviews due soon
   */
  async getReviewsDueSoon(days: number = 7): Promise<PerformanceReviewResponse[]> {
    try {
      const reviews = await this.reviewRepository.getReviewsDueSoon(days);
      return reviews.map(review => this.transformReviewResponse(review));
    } catch (error) {
      logger.error('Failed to get reviews due soon', error as Error);
      throw error;
    }
  }

  /**
   * Get overdue reviews
   */
  async getOverdueReviews(): Promise<PerformanceReviewResponse[]> {
    try {
      const reviews = await this.reviewRepository.getOverdueReviews();
      return reviews.map(review => this.transformReviewResponse(review));
    } catch (error) {
      logger.error('Failed to get overdue reviews', error as Error);
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStatistics(employeeId?: string): Promise<{
    totalReviews: number;
    completedReviews: number;
    averageRating: number;
    onTimeCompletion: number;
    overdue: number;
    completionRate: number;
  }> {
    try {
      const stats = await this.reviewRepository.getReviewStats(employeeId);
      
      return {
        ...stats,
        completionRate: stats.totalReviews > 0 ? (stats.completedReviews / stats.totalReviews) * 100 : 0,
      };
    } catch (error) {
      logger.error('Failed to get review statistics', error as Error);
      throw error;
    }
  }

  /**
   * Validate employee and reviewer exist
   */
  private async validateEmployeeAndReviewer(employeeId: string, reviewerId: string): Promise<void> {
    try {
      const [employee, reviewer] = await Promise.all([
        this.externalService.getEmployee(employeeId),
        this.externalService.getEmployee(reviewerId),
      ]);

      if (!employee) {
        throw new Error('Employee not found');
      }

      if (!reviewer) {
        throw new Error('Reviewer not found');
      }

      // Additional business logic validations can be added here
      // e.g., reviewer must be manager, same department, etc.
    } catch (error) {
      logger.error('Failed to validate employee and reviewer', error as Error);
      throw error;
    }
  }

  /**
   * Check for existing review in the same period
   */
  private async checkExistingReview(employeeId: string, reviewPeriod: string): Promise<boolean> {
    try {
      const existingReviews = await this.reviewRepository.findByEmployee(employeeId);
      return existingReviews.some(review => review.reviewPeriod === reviewPeriod);
    } catch (error) {
      logger.error('Failed to check existing review', error as Error);
      throw error;
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['EMPLOYEE_REVIEW', 'CANCELLED'],
      EMPLOYEE_REVIEW: ['MANAGER_REVIEW'],
      MANAGER_REVIEW: ['HR_REVIEW', 'COMPLETED'],
      HR_REVIEW: ['COMPLETED'],
      COMPLETED: ['APPROVED'],
      APPROVED: [], // Final state
      CANCELLED: [], // Final state
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Calculate review progress
   */
  private calculateReviewProgress(review: any): ReviewProgress {
    let completionPercentage = 0;
    const pendingTasks: string[] = [];
    const nextSteps: string[] = [];

    // Calculate completion based on status
    switch (review.status) {
      case 'DRAFT':
        completionPercentage = 10;
        pendingTasks.push('Start review process');
        nextSteps.push('Move to In Progress');
        break;
      case 'IN_PROGRESS':
        completionPercentage = 25;
        pendingTasks.push('Complete manager assessment');
        nextSteps.push('Request employee self-assessment');
        break;
      case 'EMPLOYEE_REVIEW':
        completionPercentage = 50;
        pendingTasks.push('Employee self-assessment');
        nextSteps.push('Submit for manager review');
        break;
      case 'MANAGER_REVIEW':
        completionPercentage = 75;
        pendingTasks.push('Manager review and comments');
        nextSteps.push('Submit for HR review or completion');
        break;
      case 'HR_REVIEW':
        completionPercentage = 90;
        pendingTasks.push('HR review and approval');
        nextSteps.push('Complete review process');
        break;
      case 'COMPLETED':
        completionPercentage = 100;
        nextSteps.push('Await final approval');
        break;
      case 'APPROVED':
        completionPercentage = 100;
        break;
    }

    // Adjust based on filled fields
    if (review.overallRating) completionPercentage += 5;
    if (review.strengths) completionPercentage += 5;
    if (review.areasForImprovement) completionPercentage += 5;
    if (review.developmentPlan) completionPercentage += 5;

    return {
      completionPercentage: Math.min(completionPercentage, 100),
      pendingTasks,
      nextSteps,
    };
  }

  /**
   * Transform review data to response format
   */
  private transformReviewResponse(review: any): PerformanceReviewResponse {
    return {
      ...review,
      progress: this.calculateReviewProgress(review),
    };
  }
}
