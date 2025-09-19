import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { AssessmentService } from '../services/assessment.service';

const logger = createLogger('assessment-controller');

export class AssessmentController {
  constructor(private assessmentService: AssessmentService) {}

  /**
   * Create a new assessment
   */
  createAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const assessmentData = req.body;

      const assessment = await this.assessmentService.createAssessment({
        ...assessmentData,
        createdBy: userId,
      });

      logger.info('Assessment created successfully', {
        assessmentId: assessment.id,
        title: assessment.title,
        type: assessment.type,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        assessment,
        message: 'Assessment created successfully',
      });
    } catch (error) {
      logger.error('Failed to create assessment', error as Error);
      res.status(500).json({
        error: 'Failed to create assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get assessment by ID
   */
  getAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const assessment = await this.assessmentService.getAssessment(id, userId);

      if (!assessment) {
        res.status(404).json({
          error: 'Assessment not found',
          message: 'The requested assessment was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        assessment,
      });
    } catch (error) {
      logger.error('Failed to get assessment', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update assessment
   */
  updateAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const assessment = await this.assessmentService.updateAssessment(id, updates, userId);

      logger.info('Assessment updated successfully', {
        assessmentId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        assessment,
        message: 'Assessment updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update assessment', error as Error);
      res.status(500).json({
        error: 'Failed to update assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete assessment
   */
  deleteAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.assessmentService.deleteAssessment(id, userId);

      logger.info('Assessment deleted successfully', { assessmentId: id, userId });

      res.json({
        success: true,
        message: 'Assessment deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete assessment', error as Error);
      res.status(500).json({
        error: 'Failed to delete assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List assessments
   */
  listAssessments = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        moduleId,
        courseId,
        type,
        isPublished,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        moduleId: moduleId as string,
        courseId: courseId as string,
        type: type as string,
        isPublished: isPublished ? isPublished === 'true' : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.assessmentService.listAssessments(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list assessments', error as Error);
      res.status(500).json({
        error: 'Failed to list assessments',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Publish assessment
   */
  publishAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const assessment = await this.assessmentService.publishAssessment(id, userId);

      logger.info('Assessment published', { assessmentId: id, userId });

      res.json({
        success: true,
        assessment,
        message: 'Assessment published successfully',
      });
    } catch (error) {
      logger.error('Failed to publish assessment', error as Error);
      res.status(500).json({
        error: 'Failed to publish assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Start assessment attempt
   */
  startAttempt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { enrollmentId } = req.body;

      const attempt = await this.assessmentService.startAttempt(id, enrollmentId, userId);

      logger.info('Assessment attempt started', {
        assessmentId: id,
        attemptId: attempt.id,
        userId,
      });

      res.status(201).json({
        success: true,
        attempt,
        message: 'Assessment attempt started successfully',
      });
    } catch (error) {
      logger.error('Failed to start assessment attempt', error as Error);
      res.status(500).json({
        error: 'Failed to start assessment attempt',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Submit assessment attempt
   */
  submitAttempt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, attemptId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { responses } = req.body;

      const attempt = await this.assessmentService.submitAttempt(attemptId, responses, userId);

      logger.info('Assessment attempt submitted', {
        assessmentId: id,
        attemptId,
        score: attempt.score,
        userId,
      });

      res.json({
        success: true,
        attempt,
        message: 'Assessment attempt submitted successfully',
      });
    } catch (error) {
      logger.error('Failed to submit assessment attempt', error as Error);
      res.status(500).json({
        error: 'Failed to submit assessment attempt',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get assessment attempts
   */
  getAssessmentAttempts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        enrollmentId,
        status,
        page = 1,
        limit = 20,
      } = req.query;

      const options = {
        enrollmentId: enrollmentId as string,
        status: status as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        requestingUserId: userId,
      };

      const result = await this.assessmentService.getAssessmentAttempts(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get assessment attempts', error as Error);
      res.status(500).json({
        error: 'Failed to get assessment attempts',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get attempt details
   */
  getAttemptDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { attemptId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const attempt = await this.assessmentService.getAttemptDetails(attemptId, userId);

      if (!attempt) {
        res.status(404).json({
          error: 'Attempt not found',
          message: 'The requested attempt was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        attempt,
      });
    } catch (error) {
      logger.error('Failed to get attempt details', error as Error);
      res.status(500).json({
        error: 'Failed to get attempt details',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get assessment analytics
   */
  getAssessmentAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const analytics = await this.assessmentService.getAssessmentAnalytics(id, userId);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get assessment analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get assessment analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Grade assessment manually
   */
  gradeAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { attemptId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { score, feedback } = req.body;

      const attempt = await this.assessmentService.gradeAssessment(attemptId, {
        score,
        feedback,
        gradedBy: userId,
      });

      logger.info('Assessment graded manually', {
        attemptId,
        score,
        gradedBy: userId,
      });

      res.json({
        success: true,
        attempt,
        message: 'Assessment graded successfully',
      });
    } catch (error) {
      logger.error('Failed to grade assessment', error as Error);
      res.status(500).json({
        error: 'Failed to grade assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Preview assessment (for instructors)
   */
  previewAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const preview = await this.assessmentService.previewAssessment(id, userId);

      res.json({
        success: true,
        assessment: preview,
      });
    } catch (error) {
      logger.error('Failed to preview assessment', error as Error);
      res.status(500).json({
        error: 'Failed to preview assessment',
        message: (error as Error).message,
      });
    }
  };
}
