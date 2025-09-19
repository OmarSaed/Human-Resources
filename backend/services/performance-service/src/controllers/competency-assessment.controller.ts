import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { CompetencyAssessmentService } from '../services/competency-assessment.service';

const logger = createLogger('competency-assessment-controller');

export class CompetencyAssessmentController {
  constructor(private competencyAssessmentService: CompetencyAssessmentService) {}

  /**
   * Create a new competency assessment
   */
  createAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const assessmentData = req.body;

      const assessment = await this.competencyAssessmentService.createAssessment({
        ...assessmentData,
        assessorId: userId,
      });

      logger.info('Competency assessment created successfully', {
        assessmentId: assessment.id,
        competencyId: assessment.competencyId,
        assesseeId: assessment.assesseeId,
        assessorId: userId,
      });

      res.status(201).json({
        success: true,
        assessment,
        message: 'Competency assessment created successfully',
      });
    } catch (error) {
      logger.error('Failed to create competency assessment', error as Error);
      res.status(500).json({
        error: 'Failed to create competency assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get competency assessment by ID
   */
  getAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const assessment = await this.competencyAssessmentService.getAssessment(id, userId);

      if (!assessment) {
        res.status(404).json({
          error: 'Competency assessment not found',
          message: 'The requested competency assessment was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        assessment,
      });
    } catch (error) {
      logger.error(`Failed to get competency assessment ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve competency assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update competency assessment
   */
  updateAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const assessment = await this.competencyAssessmentService.updateAssessment(id, updates, userId);

      logger.info('Competency assessment updated successfully', {
        assessmentId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        assessment,
        message: 'Competency assessment updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update competency assessment ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update competency assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete competency assessment
   */
  deleteAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.competencyAssessmentService.deleteAssessment(id, userId);

      logger.info('Competency assessment deleted successfully', { assessmentId: id, userId });

      res.json({
        success: true,
        message: 'Competency assessment deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete competency assessment ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete competency assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List competency assessments
   */
  listAssessments = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        competencyId,
        assesseeId,
        assessorId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        competencyId: competencyId as string,
        assesseeId: assesseeId as string,
        assessorId: assessorId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.competencyAssessmentService.listAssessments(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list competency assessments', error as Error);
      res.status(500).json({
        error: 'Failed to list competency assessments',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Submit competency assessment
   */
  submitAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { score, evidenceNotes, feedback } = req.body;

      const assessment = await this.competencyAssessmentService.submitAssessment(id, {
        score,
        evidenceNotes,
        feedback,
        submittedBy: userId,
      });

      logger.info('Competency assessment submitted', {
        assessmentId: id,
        score,
        submittedBy: userId,
      });

      res.json({
        success: true,
        assessment,
        message: 'Competency assessment submitted successfully',
      });
    } catch (error) {
      logger.error(`Failed to submit competency assessment ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to submit competency assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Approve competency assessment
   */
  approveAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { comments } = req.body;

      const assessment = await this.competencyAssessmentService.approveAssessment(id, userId, comments);

      logger.info('Competency assessment approved', { assessmentId: id, approvedBy: userId });

      res.json({
        success: true,
        assessment,
        message: 'Competency assessment approved successfully',
      });
    } catch (error) {
      logger.error(`Failed to approve competency assessment ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to approve competency assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Reject competency assessment
   */
  rejectAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { reason } = req.body;

      const assessment = await this.competencyAssessmentService.rejectAssessment(id, userId, reason);

      logger.info('Competency assessment rejected', { assessmentId: id, rejectedBy: userId });

      res.json({
        success: true,
        assessment,
        message: 'Competency assessment rejected',
      });
    } catch (error) {
      logger.error(`Failed to reject competency assessment ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to reject competency assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get user's competency assessments
   */
  getUserAssessments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        competencyId,
        status,
        frameworkId,
        includeHistory,
        page = 1,
        limit = 20,
        sortBy = 'assessmentDate',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        competencyId: competencyId as string,
        status: status as string,
        frameworkId: frameworkId as string,
        includeHistory: includeHistory === 'true',
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.competencyAssessmentService.getUserAssessments(targetUserId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get user assessments ${req.params.targetUserId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get user assessments',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get assessment analytics
   */
  getAssessmentAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        competencyId,
        frameworkId,
        departmentId,
        startDate,
        endDate,
      } = req.query;

      const options = {
        competencyId: competencyId as string,
        frameworkId: frameworkId as string,
        departmentId: departmentId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        requestingUserId: userId,
      };

      const analytics = await this.competencyAssessmentService.getAssessmentAnalytics(options);

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
   * Create self-assessment
   */
  createSelfAssessment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { competencyId } = req.body;

      const assessment = await this.competencyAssessmentService.createSelfAssessment({
        competencyId,
        assesseeId: userId,
        assessorId: userId,
      });

      logger.info('Self-assessment created', {
        assessmentId: assessment.id,
        competencyId,
        userId,
      });

      res.status(201).json({
        success: true,
        assessment,
        message: 'Self-assessment created successfully',
      });
    } catch (error) {
      logger.error('Failed to create self-assessment', error as Error);
      res.status(500).json({
        error: 'Failed to create self-assessment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get competency scores summary
   */
  getCompetencyScoresSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { frameworkId } = req.query;

      const summary = await this.competencyAssessmentService.getCompetencyScoresSummary({
        assesseeId: targetUserId,
        frameworkId: frameworkId as string,
        requestingUserId: userId,
      });

      res.json({
        success: true,
        summary,
      });
    } catch (error) {
      logger.error(`Failed to get competency scores summary ${req.params.targetUserId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get competency scores summary',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Bulk create assessments
   */
  bulkCreateAssessments = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { assessments } = req.body;

      const result = await this.competencyAssessmentService.bulkCreateAssessments(assessments, userId);

      logger.info('Bulk assessments created', {
        totalRequested: assessments.length,
        successful: result.successful,
        failed: result.failed,
        createdBy: userId,
      });

      res.json({
        success: true,
        result,
        message: `${result.successful} assessments created successfully, ${result.failed} failed`,
      });
    } catch (error) {
      logger.error('Failed to bulk create assessments', error as Error);
      res.status(500).json({
        error: 'Failed to bulk create assessments',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get assessment history
   */
  getAssessmentHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const history = await this.competencyAssessmentService.getAssessmentHistory(id, userId);

      res.json({
        success: true,
        history,
      });
    } catch (error) {
      logger.error(`Failed to get assessment history ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get assessment history',
        message: (error as Error).message,
      });
    }
  };
}
