import { Request, Response } from 'express';
import { PerformanceReviewService } from '../services/performance-review.service';
import { PaginationParams } from '../models/shared.models';
import { 
  PerformanceReviewCreateRequest, 
  PerformanceReviewUpdateRequest, 
  PerformanceReviewSearchParams 
} from '../types/performance.types';

// Simple logger fallback
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] performance-review-controller: ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] performance-review-controller: ${message}`, error),
  debug: (message: string, data?: any) => console.log(`[DEBUG] performance-review-controller: ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] performance-review-controller: ${message}`, data),
};

// Local type to replace @hrms/shared

export class PerformanceReviewController {
  private reviewService: PerformanceReviewService;

  constructor(reviewService: PerformanceReviewService) {
    this.reviewService = reviewService;
  }

  /**
   * Create a new performance review
   */
  createPerformanceReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: PerformanceReviewCreateRequest = req.body;
      const createdBy = (req as any).user?.id || 'system';

      const review = await this.reviewService.createPerformanceReview(data, createdBy);

      res.status(201).json({
        success: true,
        data: review,
        message: 'Performance review created successfully',
      });
    } catch (error) {
      logger.error('Failed to create performance review', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REVIEW_CREATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Get performance review by ID
   */
  getPerformanceReviewById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const review = await this.reviewService.getPerformanceReviewById(id);

      if (!review) {
        res.status(404).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Performance review not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      logger.error('Failed to get performance review by ID', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve performance review',
        },
      });
    }
  };

  /**
   * Update performance review
   */
  updatePerformanceReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: PerformanceReviewUpdateRequest = req.body;
      const updatedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      const review = await this.reviewService.updatePerformanceReview(id, data, updatedBy, reason);

      res.json({
        success: true,
        data: review,
        message: 'Performance review updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update performance review', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REVIEW_UPDATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Delete performance review
   */
  deletePerformanceReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      await this.reviewService.deletePerformanceReview(id, deletedBy, reason);

      res.json({
        success: true,
        message: 'Performance review deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete performance review', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REVIEW_DELETE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Search performance reviews
   */
  searchPerformanceReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchParams: PerformanceReviewSearchParams = {
        employeeId: req.query.employeeId as string,
        reviewerId: req.query.reviewerId as string,
        reviewType: req.query.reviewType as any,
        status: req.query.status as any,
        reviewPeriod: req.query.reviewPeriod as string,
        dueDateFrom: req.query.dueDateFrom as string,
        dueDateTo: req.query.dueDateTo as string,
        completedFrom: req.query.completedFrom as string,
        completedTo: req.query.completedTo as string,
        overallRatingMin: req.query.overallRatingMin ? parseFloat(req.query.overallRatingMin as string) : undefined,
        overallRatingMax: req.query.overallRatingMax ? parseFloat(req.query.overallRatingMax as string) : undefined,
      };

      const pagination: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await this.reviewService.searchPerformanceReviews(searchParams, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Failed to search performance reviews', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search performance reviews',
        },
      });
    }
  };

  /**
   * Get reviews by employee
   */
  getReviewsByEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const reviews = await this.reviewService.getReviewsByEmployee(employeeId);

      res.json({
        success: true,
        data: reviews,
        metadata: {
          count: reviews.length,
          employeeId,
        },
      });
    } catch (error) {
      logger.error('Failed to get reviews by employee', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve employee reviews',
        },
      });
    }
  };

  /**
   * Get reviews by reviewer
   */
  getReviewsByReviewer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewerId } = req.params;
      const reviews = await this.reviewService.getReviewsByReviewer(reviewerId);

      res.json({
        success: true,
        data: reviews,
        metadata: {
          count: reviews.length,
          reviewerId,
        },
      });
    } catch (error) {
      logger.error('Failed to get reviews by reviewer', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve reviewer reviews',
        },
      });
    }
  };

  /**
   * Get reviews due soon
   */
  getReviewsDueSoon = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const reviews = await this.reviewService.getReviewsDueSoon(days);

      res.json({
        success: true,
        data: reviews,
        metadata: {
          days,
          count: reviews.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get reviews due soon', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve reviews due soon',
        },
      });
    }
  };

  /**
   * Get overdue reviews
   */
  getOverdueReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const reviews = await this.reviewService.getOverdueReviews();

      res.json({
        success: true,
        data: reviews,
        metadata: {
          count: reviews.length,
          overdueAsOf: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get overdue reviews', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve overdue reviews',
        },
      });
    }
  };

  /**
   * Get review statistics
   */
  getReviewStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeId = req.query.employeeId as string;
      const stats = await this.reviewService.getReviewStatistics(employeeId);

      res.json({
        success: true,
        data: stats,
        metadata: {
          generatedAt: new Date(),
          employeeId,
        },
      });
    } catch (error) {
      logger.error('Failed to get review statistics', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to generate review statistics',
        },
      });
    }
  };

  /**
   * Submit review for next stage
   */
  submitReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const submittedBy = (req as any).user?.id || 'system';

      // Get current review to determine next status
      const currentReview = await this.reviewService.getPerformanceReviewById(id);
      if (!currentReview) {
        res.status(404).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Performance review not found',
          },
        });
        return;
      }

      // Determine next status based on current status
      let nextStatus: string;
      switch (currentReview.status) {
        case 'DRAFT':
        case 'IN_PROGRESS':
          nextStatus = 'EMPLOYEE_REVIEW';
          break;
        case 'EMPLOYEE_REVIEW':
          nextStatus = 'MANAGER_REVIEW';
          break;
        case 'MANAGER_REVIEW':
          nextStatus = 'COMPLETED';
          break;
        case 'HR_REVIEW':
          nextStatus = 'COMPLETED';
          break;
        default:
          throw new Error(`Cannot submit review with status ${currentReview.status}`);
      }

      const review = await this.reviewService.updatePerformanceReview(
        id,
        { status: nextStatus as any },
        submittedBy,
        'Review submitted for next stage'
      );

      res.json({
        success: true,
        data: review,
        message: `Review submitted successfully. Status updated to ${nextStatus}`,
      });
    } catch (error) {
      logger.error('Failed to submit review', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REVIEW_SUBMIT_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Approve review
   */
  approveReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const approvedBy = (req as any).user?.id || 'system';
      const comments = req.body.comments;

      const review = await this.reviewService.updatePerformanceReview(
        id,
        { 
          status: 'APPROVED',
          hrComments: comments,
        },
        approvedBy,
        'Review approved'
      );

      res.json({
        success: true,
        data: review,
        message: 'Review approved successfully',
      });
    } catch (error) {
      logger.error('Failed to approve review', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REVIEW_APPROVE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };
}
