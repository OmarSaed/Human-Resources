import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { ApplicationService } from '../services/application.service';

const logger = createLogger('application-controller');

export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  /**
   * Create application
   */
  createApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const applicationData = req.body;

      const application = await this.applicationService.createApplication(applicationData);

      logger.info('Application created successfully', {
        applicationId: application.id,
        candidateId: application.candidateId,
        jobPostingId: application.jobPostingId,
        userId,
      });

      res.status(201).json({
        success: true,
        application,
        message: 'Application created successfully',
      });
    } catch (error) {
      logger.error('Failed to create application', error as Error);
      res.status(500).json({
        error: 'Failed to create application',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get application by ID
   */
  getApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const application = await this.applicationService.getApplication(id);

      if (!application) {
        res.status(404).json({
          error: 'Application not found',
          message: 'The requested application was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        application,
      });
    } catch (error) {
      logger.error(`Failed to get application ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve application',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update application
   */
  updateApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const application = await this.applicationService.updateApplication(id, updates);

      logger.info('Application updated successfully', {
        applicationId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        application,
        message: 'Application updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update application ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update application',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete application
   */
  deleteApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.applicationService.deleteApplication(id);

      logger.info('Application deleted successfully', { applicationId: id, userId });

      res.json({
        success: true,
        message: 'Application deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete application ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete application',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List applications
   */
  listApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        candidateId,
        jobPostingId,
        status,
        stage,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'appliedAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        candidateId: candidateId as string,
        jobPostingId: jobPostingId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.applicationService.listApplications(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list applications', error as Error);
      res.status(500).json({
        error: 'Failed to list applications',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get candidate applications
   */
  getCandidateApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { candidateId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const applications = await this.applicationService.getCandidateApplications(candidateId);

      res.json({
        success: true,
        applications,
      });
    } catch (error) {
      logger.error(`Failed to get candidate applications ${req.params.candidateId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get candidate applications',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get job posting applications
   */
  getJobPostingApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobPostingId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const applications = await this.applicationService.getJobPostingApplications(jobPostingId);

      res.json({
        success: true,
        applications,
      });
    } catch (error) {
      logger.error(`Failed to get job posting applications ${req.params.jobPostingId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get job posting applications',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get application analytics
   */
  getApplicationAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { jobPostingId } = req.query;

      const analytics = await this.applicationService.getApplicationAnalytics(jobPostingId as string);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get application analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get application analytics',
        message: (error as Error).message,
      });
    }
  };
}