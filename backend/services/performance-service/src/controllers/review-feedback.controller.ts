import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { ReviewFeedbackService } from '../services/review-feedback.service';

const logger = createLogger('review-feedback-controller');

export class ReviewFeedbackController {
  constructor(private reviewFeedbackService: ReviewFeedbackService) {}

  /**
   * Create feedback for a performance review
   */
  createFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const feedbackData = req.body;

      const feedback = await this.reviewFeedbackService.createFeedback({
        ...feedbackData,
        providerId: userId,
      });

      logger.info('Review feedback created successfully', {
        feedbackId: feedback.id,
        reviewId: feedback.reviewId,
        type: feedback.type,
        providerId: userId,
      });

      res.status(201).json({
        success: true,
        feedback,
        message: 'Review feedback created successfully',
      });
    } catch (error) {
      logger.error('Failed to create review feedback', error as Error);
      res.status(500).json({
        error: 'Failed to create review feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get feedback by ID
   */
  getFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const feedback = await this.reviewFeedbackService.getFeedback(id, userId);

      if (!feedback) {
        res.status(404).json({
          error: 'Review feedback not found',
          message: 'The requested review feedback was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        feedback,
      });
    } catch (error) {
      logger.error(`Failed to get review feedback ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve review feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update feedback
   */
  updateFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const feedback = await this.reviewFeedbackService.updateFeedback(id, updates, userId);

      logger.info('Review feedback updated successfully', {
        feedbackId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        feedback,
        message: 'Review feedback updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update review feedback ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update review feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete feedback
   */
  deleteFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.reviewFeedbackService.deleteFeedback(id, userId);

      logger.info('Review feedback deleted successfully', { feedbackId: id, userId });

      res.json({
        success: true,
        message: 'Review feedback deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete review feedback ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete review feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get review feedback
   */
  getReviewFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        type,
        providerId,
        includeAnonymous,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        type: type as string,
        providerId: providerId as string,
        includeAnonymous: includeAnonymous === 'true',
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.reviewFeedbackService.getReviewFeedback(reviewId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get review feedback ${req.params.reviewId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get review feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Request feedback from colleagues
   */
  requestFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { requesteeIds, message, dueDate } = req.body;

      const requests = await this.reviewFeedbackService.requestFeedback({
        reviewId,
        requesteeIds,
        message,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        requesterId: userId,
      });

      logger.info('Feedback requests sent', {
        reviewId,
        requestCount: requests.length,
        requesterId: userId,
      });

      res.status(201).json({
        success: true,
        requests,
        message: `${requests.length} feedback requests sent successfully`,
      });
    } catch (error) {
      logger.error(`Failed to request feedback ${req.params.reviewId}`, error as Error);
      res.status(500).json({
        error: 'Failed to request feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get pending feedback requests
   */
  getPendingRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        reviewId,
        requesterId,
        page = 1,
        limit = 20,
        sortBy = 'dueDate',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        reviewId: reviewId as string,
        requesterId: requesterId as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.reviewFeedbackService.getPendingRequests(userId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get pending feedback requests', error as Error);
      res.status(500).json({
        error: 'Failed to get pending feedback requests',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Submit feedback response
   */
  submitFeedbackResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const responseData = req.body;

      const feedback = await this.reviewFeedbackService.submitFeedbackResponse(requestId, {
        ...responseData,
        providerId: userId,
      });

      logger.info('Feedback response submitted', {
        requestId,
        feedbackId: feedback.id,
        providerId: userId,
      });

      res.status(201).json({
        success: true,
        feedback,
        message: 'Feedback response submitted successfully',
      });
    } catch (error) {
      logger.error(`Failed to submit feedback response ${req.params.requestId}`, error as Error);
      res.status(500).json({
        error: 'Failed to submit feedback response',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get feedback analytics
   */
  getFeedbackAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const analytics = await this.reviewFeedbackService.getFeedbackAnalytics(reviewId, userId);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error(`Failed to get feedback analytics ${req.params.reviewId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get feedback analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get user feedback summary
   */
  getUserFeedbackSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        startDate,
        endDate,
        includeGiven,
        includeReceived,
      } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        includeGiven: includeGiven !== 'false',
        includeReceived: includeReceived !== 'false',
        requestingUserId: userId,
      };

      const summary = await this.reviewFeedbackService.getUserFeedbackSummary(targetUserId, options);

      res.json({
        success: true,
        summary,
      });
    } catch (error) {
      logger.error(`Failed to get user feedback summary ${req.params.targetUserId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get user feedback summary',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Anonymize feedback
   */
  anonymizeFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const feedback = await this.reviewFeedbackService.anonymizeFeedback(id, userId);

      logger.info('Feedback anonymized', { feedbackId: id, userId });

      res.json({
        success: true,
        feedback,
        message: 'Feedback anonymized successfully',
      });
    } catch (error) {
      logger.error(`Failed to anonymize feedback ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to anonymize feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Generate feedback report
   */
  generateFeedbackReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        reviewIds,
        employeeIds,
        departmentId,
        startDate,
        endDate,
        format = 'json',
        includeAnonymous,
      } = req.body;

      const options = {
        reviewIds,
        employeeIds,
        departmentId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        format,
        includeAnonymous: includeAnonymous !== false,
        requestingUserId: userId,
      };

      const report = await this.reviewFeedbackService.generateFeedbackReport(options);

      if (format === 'json') {
        res.json({
          success: true,
          report,
        });
      } else {
        const filename = `feedback-report-${new Date().toISOString().split('T')[0]}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
        }
        
        res.send(report);
      }
    } catch (error) {
      logger.error('Failed to generate feedback report', error as Error);
      res.status(500).json({
        error: 'Failed to generate feedback report',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Bulk request feedback
   */
  bulkRequestFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { requests } = req.body;

      const result = await this.reviewFeedbackService.bulkRequestFeedback(requests, userId);

      logger.info('Bulk feedback requests sent', {
        totalRequested: requests.length,
        successful: result.successful,
        failed: result.failed,
        requesterId: userId,
      });

      res.json({
        success: true,
        result,
        message: `${result.successful} feedback requests sent successfully, ${result.failed} failed`,
      });
    } catch (error) {
      logger.error('Failed to bulk request feedback', error as Error);
      res.status(500).json({
        error: 'Failed to bulk request feedback',
        message: (error as Error).message,
      });
    }
  };
}
