import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { InterviewService } from '../services/interview.service';

const logger = createLogger('interview-controller');

export class InterviewController {
  constructor(private interviewService: InterviewService) {}

  /**
   * Schedule a new interview
   */
  scheduleInterview = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const interviewData = req.body;

      const interview = await this.interviewService.scheduleInterview(interviewData, userId);

      logger.info('Interview scheduled successfully', {
        interviewId: interview.id,
        candidateId: interview.candidateId,
        jobPostingId: interview.jobPostingId,
        scheduledBy: userId,
      });

      res.status(201).json({
        success: true,
        interview,
        message: 'Interview scheduled successfully',
      });
    } catch (error) {
      logger.error('Failed to schedule interview', error as Error);
      res.status(500).json({
        error: 'Failed to schedule interview',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get interview by ID
   */
  getInterview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const interview = await this.interviewService.getInterview(id, userId);

      if (!interview) {
        res.status(404).json({
          error: 'Interview not found',
          message: 'The requested interview was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        interview,
      });
    } catch (error) {
      logger.error(`Failed to get interview ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve interview',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update interview
   */
  updateInterview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const interview = await this.interviewService.updateInterview(id, updates, userId);

      logger.info('Interview updated successfully', {
        interviewId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        interview,
        message: 'Interview updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update interview ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update interview',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Cancel interview
   */
  cancelInterview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { reason } = req.body;

      const interview = await this.interviewService.cancelInterview(id, reason, userId);

      logger.info('Interview cancelled', { interviewId: id, reason, userId });

      res.json({
        success: true,
        interview,
        message: 'Interview cancelled successfully',
      });
    } catch (error) {
      logger.error(`Failed to cancel interview ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to cancel interview',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List interviews
   */
  listInterviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        applicationId,
        candidateId,
        jobPostingId,
        interviewerId,
        status,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'scheduledAt',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        applicationId: applicationId as string,
        candidateId: candidateId as string,
        jobPostingId: jobPostingId as string,
        interviewerId: interviewerId as string,
        status: status as string,
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.interviewService.listInterviews(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list interviews', error as Error);
      res.status(500).json({
        error: 'Failed to list interviews',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Submit interview feedback
   */
  submitFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const feedbackData = req.body;

      const interview = await this.interviewService.submitFeedback(id, {
        ...feedbackData,
        submittedBy: userId,
      });

      logger.info('Interview feedback submitted', {
        interviewId: id,
        overallRating: feedbackData.overallRating,
        userId,
      });

      res.json({
        success: true,
        interview,
        message: 'Interview feedback submitted successfully',
      });
    } catch (error) {
      logger.error(`Failed to submit interview feedback ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to submit interview feedback',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Reschedule interview
   */
  rescheduleInterview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { scheduledAt, reason } = req.body;

      const interview = await this.interviewService.rescheduleInterview(id, {
        scheduledAt: new Date(scheduledAt),
        reason,
        rescheduledBy: userId,
      });

      logger.info('Interview rescheduled', {
        interviewId: id,
        newDate: scheduledAt,
        userId,
      });

      res.json({
        success: true,
        interview,
        message: 'Interview rescheduled successfully',
      });
    } catch (error) {
      logger.error(`Failed to reschedule interview ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to reschedule interview',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Mark interview as no-show
   */
  markNoShow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { notes } = req.body;

      const interview = await this.interviewService.markNoShow(id, notes, userId);

      logger.info('Interview marked as no-show', { interviewId: id, userId });

      res.json({
        success: true,
        interview,
        message: 'Interview marked as no-show',
      });
    } catch (error) {
      logger.error(`Failed to mark interview as no-show ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to mark interview as no-show',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get interviewer schedule
   */
  getInterviewerSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { interviewerId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { startDate, endDate } = req.query;

      const schedule = await this.interviewService.getInterviewerSchedule(interviewerId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        requestingUserId: userId,
      });

      res.json({
        success: true,
        schedule,
      });
    } catch (error) {
      logger.error(`Failed to get interviewer schedule ${req.params.interviewerId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get interviewer schedule',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get interview analytics
   */
  getInterviewAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { startDate, endDate, interviewerId, jobPostingId } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        interviewerId: interviewerId as string,
        jobPostingId: jobPostingId as string,
        requestingUserId: userId,
      };

      const analytics = await this.interviewService.getInterviewAnalytics(options);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get interview analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get interview analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Check interviewer availability
   */
  checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { interviewerId } = req.params;
      const { date, duration = 60 } = req.query;

      if (!date) {
        res.status(400).json({
          error: 'Date is required',
          message: 'Please provide a date to check availability',
        });
        return;
      }

      const availability = await this.interviewService.checkInterviewerAvailability(
        interviewerId,
        new Date(date as string),
        parseInt(duration as string)
      );

      res.json({
        success: true,
        availability,
      });
    } catch (error) {
      logger.error(`Failed to check interviewer availability ${req.params.interviewerId}`, error as Error);
      res.status(500).json({
        error: 'Failed to check interviewer availability',
        message: (error as Error).message,
      });
    }
  };
}
