import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { CandidateService } from '../services/candidate.service';

const logger = createLogger('candidate-controller');

export class CandidateController {
  constructor(private candidateService: CandidateService) {}

  /**
   * Create a new candidate
   */
  createCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const candidateData = req.body;

      const candidate = await this.candidateService.createCandidate(candidateData, userId);

      logger.info('Candidate created successfully', {
        candidateId: candidate.id,
        email: candidate.email,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        candidate,
        message: 'Candidate created successfully',
      });
    } catch (error) {
      logger.error('Failed to create candidate', error as Error);
      res.status(500).json({
        error: 'Failed to create candidate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get candidate by ID
   */
  getCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const candidate = await this.candidateService.getCandidate(id, userId);

      if (!candidate) {
        res.status(404).json({
          error: 'Candidate not found',
          message: 'The requested candidate was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        candidate,
      });
    } catch (error) {
      logger.error(`Failed to get candidate ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve candidate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update candidate
   */
  updateCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const candidate = await this.candidateService.updateCandidate(id, updates, userId);

      logger.info('Candidate updated successfully', {
        candidateId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        candidate,
        message: 'Candidate updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update candidate ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update candidate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete candidate
   */
  deleteCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.candidateService.deleteCandidate(id, userId);

      logger.info('Candidate deleted successfully', { candidateId: id, userId });

      res.json({
        success: true,
        message: 'Candidate deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete candidate ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete candidate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List candidates
   */
  listCandidates = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        status,
        source,
        skills,
        experience,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        status: status as string,
        source: source as string,
        skills: skills ? (skills as string).split(',') : undefined,
        experience: experience ? parseInt(experience as string) : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.candidateService.listCandidates(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to list candidates`, error as Error);
      res.status(500).json({
        error: 'Failed to list candidates',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Search candidates
   */
  searchCandidates = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        query,
        skills,
        experience,
        location,
        education,
        page = 1,
        limit = 20,
      } = req.query;

      const searchOptions = {
        query: query as string,
        skills: skills ? (skills as string).split(',') : undefined,
        experience: experience ? parseInt(experience as string) : undefined,
        location: location as string,
        education: education ? [education as string] : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
      };

      const result = await this.candidateService.searchCandidates(searchOptions);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
        logger.error('Candidate search failed', error as Error);
      res.status(500).json({
        error: 'Search failed',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Upload candidate resume
   */
  uploadResume = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const file = (req as any).file;

      if (!file) {
        res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a resume file',
        });
        return;
      }

      const result = await this.candidateService.uploadResume(id, file, userId);

      logger.info('Resume uploaded successfully', {
        candidateId: id,
        fileName: file.originalname,
        userId,
      });

      res.json({
        success: true,
        resume: result,
        message: 'Resume uploaded successfully',
      });
    } catch (error) {
      logger.error(`Failed to upload resume ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to upload resume',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Parse candidate resume
   */
  parseResume = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const parsedData = await this.candidateService.parseResume(id, userId);

      logger.info('Resume parsed successfully', { candidateId: id, userId });

      res.json({
        success: true,
        parsedData,
        message: 'Resume parsed successfully',
      });
    } catch (error) {
      logger.error(`Failed to parse resume ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to parse resume',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Add candidate to blacklist
   */
  blacklistCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { reason } = req.body;

      const candidate = await this.candidateService.blacklistCandidate(id, reason, userId);

      logger.info('Candidate blacklisted', { candidateId: id, reason, userId });

      res.json({
        success: true,
        candidate,
        message: 'Candidate blacklisted successfully',
      });
    } catch (error) {
      logger.error(`Failed to blacklist candidate ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to blacklist candidate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Remove candidate from blacklist
   */
  removeFromBlacklist = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const candidate = await this.candidateService.removeFromBlacklist(id, userId);

      logger.info('Candidate removed from blacklist', { candidateId: id, userId });

      res.json({
        success: true,
        candidate,
        message: 'Candidate removed from blacklist successfully',
      });
    } catch (error) {
      logger.error(`Failed to remove candidate from blacklist ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to remove candidate from blacklist',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get candidate applications
   */
  getCandidateApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        status,
        page = 1,
        limit = 20,
      } = req.query;

      const options = {
        status: status as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        requestingUserId: userId,
      };

      const result = await this.candidateService.getCandidateApplications(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get candidate applications ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get candidate applications',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get candidate analytics
   */
  getCandidateAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { startDate, endDate, source, status } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        source: source as string,
        status: status as string,
        requestingUserId: userId,
      };

      const analytics = await this.candidateService.getCandidateAnalytics(options);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get candidate analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get candidate analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Merge duplicate candidates
   */
  mergeCandidates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { primaryId, duplicateId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const mergedCandidate = await this.candidateService.mergeCandidates(primaryId, duplicateId, userId);

      logger.info('Candidates merged successfully', { primaryId, duplicateId, userId });

      res.json({
        success: true,
        candidate: mergedCandidate,
        message: 'Candidates merged successfully',
      });
    } catch (error) {
        logger.error('Failed to merge candidates', error as Error);
      res.status(500).json({
        error: 'Failed to merge candidates',
        message: (error as Error).message,
      });
    }
  };
}
