import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { JobPostingService } from '../services/job-posting.service';

const logger = createLogger('job-posting-controller');

export class JobPostingController {
  constructor(private jobPostingService: JobPostingService) {}

  /**
   * Create a new job posting
   */
  createJobPosting = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const jobData = req.body;

      const job = await this.jobPostingService.createJobPosting({
        ...jobData,
        hiringManagerId: jobData.hiringManagerId || userId,
      });

      logger.info('Job posting created successfully', {
        jobId: job.id,
        title: job.title,
        hiringManagerId: userId,
      });

      res.status(201).json({
        success: true,
        jobPosting: job,
        message: 'Job posting created successfully',
      });
    } catch (error) {
      logger.error('Failed to create job posting', error as Error);
      res.status(500).json({
        error: 'Failed to create job posting',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get job posting by ID
   */
  getJobPosting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const job = await this.jobPostingService.getJobPosting(id, userId);

      if (!job) {
        res.status(404).json({
          error: 'Job posting not found',
          message: 'The requested job posting was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        jobPosting: job,
      });
    } catch (error) {
      logger.error(`Failed to get job posting ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve job posting',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update job posting
   */
  updateJobPosting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const job = await this.jobPostingService.updateJobPosting(id, updates, userId);

      logger.info('Job posting updated successfully', {
        jobId: id,  
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        jobPosting: job,
        message: 'Job posting updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update job posting ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update job posting',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete job posting
   */
  deleteJobPosting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.jobPostingService.deleteJobPosting(id, userId);

      logger.info('Job posting deleted successfully', { jobId: id, userId });

      res.json({
        success: true,
        message: 'Job posting deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete job posting ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete job posting',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List job postings
   */
  listJobPostings = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        department,
        status,
        workType,
        workArrangement,
        hiringManagerId,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
      } = req.query;

      const options = {
        department: department as string,
        status: status as string,
        workType: workType as string,
        workArrangement: workArrangement as string,
        hiringManagerId: hiringManagerId as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
      };

      const result = await this.jobPostingService.listJobPostings(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list job postings', error as Error);
      res.status(500).json({
        error: 'Failed to list job postings',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Publish job posting
   */
  publishJobPosting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { expiresAt } = req.body;

      const job = await this.jobPostingService.publishJobPosting(id, userId, {
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      logger.info('Job posting published', { jobId: id, userId });

      res.json({
        success: true,
        jobPosting: job,
        message: 'Job posting published successfully',
      });
    } catch (error) {
      logger.error(`Failed to publish job posting ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to publish job posting',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Pause job posting
   */
  pauseJobPosting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const job = await this.jobPostingService.pauseJobPosting(id, userId);

      logger.info('Job posting paused', { jobId: id, userId });

      res.json({
        success: true,
        jobPosting: job,
        message: 'Job posting paused successfully',
      });
    } catch (error) {
      logger.error(`Failed to pause job posting ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to pause job posting',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get job posting applications
   */
  getJobApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        status,
        stage,
        page = 1,
        limit = 20,
        sortBy = 'appliedAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        status: status as string,
        stage: stage as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.jobPostingService.getJobApplications(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get job applications ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get job applications',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get job posting statistics
   */
  getJobStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const stats = await this.jobPostingService.getJobStatistics(id, userId);

      res.json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      logger.error(`Failed to get job statistics ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get job statistics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Search public job postings (for candidates)
   */
  searchPublicJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        query,
        department,
        location,
        workType,
        workArrangement,
        salaryMin,
        salaryMax,
        page = 1,
        limit = 20,
      } = req.query;

      const searchOptions = {
        query: query as string,
        department: department as string,
        location: location as string,
        workType: workType as string,
        workArrangement: workArrangement as string,
        salaryMin: salaryMin ? parseInt(salaryMin as string) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
      };

      const result = await this.jobPostingService.searchPublicJobs(searchOptions);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Public job search failed', error as Error);
      res.status(500).json({
        error: 'Search failed',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get job posting analytics
   */
  getJobAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { startDate, endDate, department } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        department: department as string,
        requestingUserId: userId,
      };

      const analytics = await this.jobPostingService.getJobAnalytics(options);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get job analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get job analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Clone job posting
   */
  cloneJobPosting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { title, department } = req.body;

      const job = await this.jobPostingService.cloneJobPosting(id, userId, {
        title,
        department,
      });

      logger.info('Job posting cloned', {
        originalJobId: id,
        newJobId: job.id,
        userId,
      });

      res.status(201).json({
        success: true,
        jobPosting: job,
        message: 'Job posting cloned successfully',
      });
    } catch (error) {
      logger.error(`Failed to clone job posting ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to clone job posting',
        message: (error as Error).message,
      });
    }
  };
}
