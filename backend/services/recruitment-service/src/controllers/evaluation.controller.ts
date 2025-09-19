import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { EvaluationService } from '../services/evaluation.service';

const logger = createLogger('evaluation-controller');

export class EvaluationController {
  constructor(private evaluationService: EvaluationService) {}

  /**
   * Create candidate evaluation
   */
  createEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const evaluationData = req.body;

      const evaluation = await this.evaluationService.createEvaluation({
        ...evaluationData,
        evaluatorId: userId,
      });

      logger.info('Candidate evaluation created successfully', {
        evaluationId: evaluation.id,
        candidateId: evaluation.candidateId,
        type: evaluation.type,
        evaluatorId: userId,
      });

      res.status(201).json({
        success: true,
        evaluation,
        message: 'Candidate evaluation created successfully',
      });
    } catch (error) {
      logger.error('Failed to create candidate evaluation', error as Error);
      res.status(500).json({
        error: 'Failed to create candidate evaluation',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get evaluation by ID
   */
  getEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const evaluation = await this.evaluationService.getEvaluationById(id);

      if (!evaluation) {
        res.status(404).json({
          error: 'Evaluation not found',
          message: 'The requested evaluation was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        evaluation,
      });
    } catch (error) {
      logger.error(`Failed to get evaluation ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve evaluation',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update evaluation
   */
  updateEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const evaluation = await this.evaluationService.updateEvaluation(id, updates);

      logger.info('Evaluation updated successfully', {
        evaluationId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        evaluation,
        message: 'Evaluation updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update evaluation ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update evaluation',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete evaluation
   */
  deleteEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.evaluationService.deleteEvaluation(id);

      logger.info('Evaluation deleted successfully', { evaluationId: id, userId });

      res.json({
        success: true,
        message: 'Evaluation deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete evaluation ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete evaluation',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get candidate evaluations
   */
  getCandidateEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { candidateId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        type,
        status,
        evaluatorId,
        page = 1,
        limit = 20,
        sortBy = 'evaluationDate',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        type: type as string,
        status: status as string,
        evaluatorId: evaluatorId as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.evaluationService.getCandidateEvaluations(candidateId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get candidate evaluations ${req.params.candidateId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get candidate evaluations',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List evaluations
   */
  listEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        candidateId,
        jobPostingId,
        type,
        status,
        evaluatorId,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'evaluationDate',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        candidateId: candidateId as string,
        jobPostingId: jobPostingId as string,
        type: type as string,
        status: status as string,
        evaluatorId: evaluatorId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.evaluationService.listEvaluations(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list evaluations', error as Error);
      res.status(500).json({
        error: 'Failed to list evaluations',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Submit evaluation
   */
  submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { scores, overallScore, recommendation, comments } = req.body;

      const evaluation = await this.evaluationService.submitEvaluation(id, {
        scores,
        overallScore,
        recommendation,
        comments,
        submittedBy: userId,
      });

      logger.info('Evaluation submitted', {
        evaluationId: id,
        overallScore,
        recommendation,
        submittedBy: userId,
      });

      res.json({
        success: true,
        evaluation,
        message: 'Evaluation submitted successfully',
      });
    } catch (error) {
      logger.error(`Failed to submit evaluation ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to submit evaluation',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get evaluation analytics
   */
  getEvaluationAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        candidateId,
        jobPostingId,
        startDate,
        endDate,
      } = req.query;

      const options = {
        candidateId: candidateId as string,
        jobPostingId: jobPostingId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        requestingUserId: userId,
      };

      const analytics = await this.evaluationService.getEvaluationAnalytics(options);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get evaluation analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get evaluation analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Compare candidate evaluations
   */
  compareCandidateEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { candidateIds, jobPostingId } = req.body;

      const comparison = await this.evaluationService.getCandidateEvaluations(candidateIds[0]); 

      res.json({
        success: true,
        comparison,
      });
    } catch (error) {
      logger.error('Failed to compare candidate evaluations', error as Error);
      res.status(500).json({
        error: 'Failed to compare candidate evaluations',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Generate evaluation report
   */
  generateEvaluationReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        candidateIds,
        jobPostingId,
        evaluatorId,
        startDate,
        endDate,
        format = 'json',
      } = req.body;

      const report = await this.evaluationService.generateReport({
        candidateId: candidateIds?.[0],
        jobPostingId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        format,
      });

      if (format === 'json') {
        res.json({
          success: true,
          report,
        });
      } else {
        const filename = `evaluation-report-${new Date().toISOString().split('T')[0]}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
        }
        
        res.send(report);
      }
    } catch (error) {
      logger.error('Failed to generate evaluation report', error as Error);
      res.status(500).json({
        error: 'Failed to generate evaluation report',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Bulk create evaluations
   */
  bulkCreateEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { evaluations } = req.body;

      // Simplified bulk create - create one by one for now
      const results = [];
      for (const evaluation of evaluations) {
        const result = await this.evaluationService.createEvaluation(evaluation);
        results.push(result);
      }
      const result = { evaluations: results };

      logger.info('Bulk evaluations created', {
        totalRequested: evaluations.length,
        successful: results.length,
        failed: 0,
        createdBy: userId,
      });

      res.json({
        success: true,
        result,
        message: `${results.length} evaluations created successfully, 0 failed`,
      });
    } catch (error) {
      logger.error('Failed to bulk create evaluations', error as Error);
      res.status(500).json({
        error: 'Failed to bulk create evaluations',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get evaluation summary
   */
  getEvaluationSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { candidateId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const summary = await this.evaluationService.getCandidateEvaluations(candidateId);

      res.json({
        success: true,
        summary,
      });
    } catch (error) {
        logger.error(`Failed to get evaluation summary ${req.params.candidateId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get evaluation summary',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Calculate candidate ranking
   */
  calculateCandidateRanking = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { jobPostingId, criteria } = req.body;

      const ranking = await this.evaluationService.rankCandidates({
        jobPostingId,
        criteria,
      });

      res.json({
        success: true,
        ranking,
      });
    } catch (error) {
      logger.error('Failed to calculate candidate ranking', error as Error);
      res.status(500).json({
        error: 'Failed to calculate candidate ranking',
        message: (error as Error).message,
      });
    }
  };
}
