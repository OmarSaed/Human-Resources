import { Request, Response } from 'express';
import { LearningPathService } from '../services/learning-path.service';
import { createLogger } from '@hrms/shared';

const logger = createLogger('learning-path-controller');

export class LearningPathController {
  constructor(private learningPathService: LearningPathService) {}

  /**
   * Create a new learning path
   */
  createLearningPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const pathData = req.body;
      const userId = (req as any).user?.id;

      logger.info('Creating learning path', { 
        pathTitle: pathData.title,
        userId 
      });

      const learningPath = await this.learningPathService.createLearningPath({
        ...pathData,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: learningPath,
        message: 'Learning path created successfully',
      });
    } catch (error) {
      logger.error('Error creating learning path', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create learning path',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get all learning paths with pagination and filtering
   */
  listLearningPaths = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        level,
        isActive,
        search,
      } = req.query;

      logger.info('Listing learning paths', {
        page,
        limit,
        category,
        level,
        isActive,
        search,
      });

      const filters = {
        category: category as string,
        level: level as any,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search: search as string,
      };

      const result = await this.learningPathService.listLearningPaths(
        Number(page),
        Number(limit),
        filters
      );

      res.json({
        success: true,
        data: result.learningPaths,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Error listing learning paths', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to list learning paths',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get a specific learning path by ID
   */
  getLearningPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const includeProgress = req.query.includeProgress === 'true';
      const userId = (req as any).user?.id;

      logger.info('Getting learning path', { pathId: id, includeProgress });

      const learningPath = await this.learningPathService.getLearningPathById(
        id,
        includeProgress ? userId : undefined
      );

      if (!learningPath) {
        res.status(404).json({
          success: false,
          error: 'Learning path not found',
        });
        return;
      }

      res.json({
        success: true,
        data: learningPath,
      });
    } catch (error) {
      logger.error('Error getting learning path', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get learning path',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Update a learning path
   */
  updateLearningPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as any).user?.id;

      logger.info('Updating learning path', { 
        pathId: id,
        userId 
      });

      const learningPath = await this.learningPathService.updateLearningPath(id, {
        ...updateData,
        updatedBy: userId,
      });

      res.json({
        success: true,
        data: learningPath,
        message: 'Learning path updated successfully',
      });
    } catch (error) {
      logger.error('Error updating learning path', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update learning path',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Delete a learning path
   */
  deleteLearningPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      logger.info('Deleting learning path', { 
        pathId: id,
        userId 
      });

      await this.learningPathService.deleteLearningPath(id);

      res.json({
        success: true,
        message: 'Learning path deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting learning path', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete learning path',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Enroll in a learning path
   */
  enrollInPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { employeeId } = req.body;
      const userId = (req as any).user?.id;

      // Use provided employeeId or default to current user
      const targetEmployeeId = employeeId || userId;

      logger.info('Enrolling in learning path', { 
        pathId: id,
        employeeId: targetEmployeeId,
        enrolledBy: userId 
      });

      const enrollment = await this.learningPathService.enrollInLearningPath(
        id,
        targetEmployeeId,
        userId
      );

      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Successfully enrolled in learning path',
      });
    } catch (error) {
      logger.error('Error enrolling in learning path', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to enroll in learning path',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get employee's enrollment in a learning path
   */
  getPathEnrollment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { employeeId } = req.query;
      const userId = (req as any).user?.id;

      // Use provided employeeId or default to current user
      const targetEmployeeId = (employeeId as string) || userId;

      logger.info('Getting path enrollment', { 
        pathId: id,
        employeeId: targetEmployeeId 
      });

      const enrollment = await this.learningPathService.getLearningPathEnrollment(
        id,
        targetEmployeeId
      );

      if (!enrollment) {
        res.status(404).json({
          success: false,
          error: 'Enrollment not found',
        });
        return;
      }

      res.json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      logger.error('Error getting path enrollment', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get path enrollment',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Update enrollment progress
   */
  updateEnrollmentProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { employeeId, courseId, completed } = req.body;
      const userId = (req as any).user?.id;

      // Use provided employeeId or default to current user
      const targetEmployeeId = employeeId || userId;

      logger.info('Updating enrollment progress', { 
        pathId: id,
        employeeId: targetEmployeeId,
        courseId,
        completed 
      });

      const updatedEnrollment = await this.learningPathService.updateLearningPathProgress(
        id,
        targetEmployeeId,
        courseId,
        completed
      );

      res.json({
        success: true,
        data: updatedEnrollment,
        message: 'Progress updated successfully',
      });
    } catch (error) {
      logger.error('Error updating enrollment progress', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update progress',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get learning path analytics
   */
  getPathAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      logger.info('Getting learning path analytics', { 
        pathId: id,
        startDate,
        endDate 
      });

      const analytics = await this.learningPathService.getLearningPathAnalytics(
        id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting path analytics', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analytics',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get recommended learning paths for an employee
   */
  getRecommendedPaths = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.query;
      const userId = (req as any).user?.id;

      // Use provided employeeId or default to current user
      const targetEmployeeId = (employeeId as string) || userId;

      logger.info('Getting recommended learning paths', { 
        employeeId: targetEmployeeId 
      });

      const recommendations = await this.learningPathService.getRecommendedLearningPaths(
        targetEmployeeId
      );

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      logger.error('Error getting recommended paths', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Clone a learning path
   */
  cloneLearningPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const userId = (req as any).user?.id;

      logger.info('Cloning learning path', { 
        pathId: id,
        newTitle: title,
        userId 
      });

      const clonedPath = await this.learningPathService.cloneLearningPath(id, title, userId);

      res.status(201).json({
        success: true,
        data: clonedPath,
        message: 'Learning path cloned successfully',
      });
    } catch (error) {
      logger.error('Error cloning learning path', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to clone learning path',
        details: (error as Error).message,
      });
    }
  };
}
