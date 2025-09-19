import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { DevelopmentPlanService } from '../services/development-plan.service';

const logger = createLogger('development-plan-controller');

export class DevelopmentPlanController {
  constructor(private developmentPlanService: DevelopmentPlanService) {}

  /**
   * Create a new development plan
   */
  createDevelopmentPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const planData = req.body;

      const plan = await this.developmentPlanService.createDevelopmentPlan({
        ...planData,
        managerId: userId,
      });

      logger.info('Development plan created successfully', {
        planId: plan.id,
        title: plan.title,
        employeeId: plan.employeeId,
        managerId: userId,
      });

      res.status(201).json({
        success: true,
        developmentPlan: plan,
        message: 'Development plan created successfully',
      });
    } catch (error) {
      logger.error('Failed to create development plan', error as Error);
      res.status(500).json({
        error: 'Failed to create development plan',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get development plan by ID
   */
  getDevelopmentPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const plan = await this.developmentPlanService.getDevelopmentPlan(id, userId);

      if (!plan) {
        res.status(404).json({
          error: 'Development plan not found',
          message: 'The requested development plan was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        developmentPlan: plan,
      });
    } catch (error) {
      logger.error(`Failed to get development plan ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve development plan',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update development plan
   */
  updateDevelopmentPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const plan = await this.developmentPlanService.updateDevelopmentPlan(id, updates, userId);

      logger.info('Development plan updated successfully', {
        planId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        developmentPlan: plan,
        message: 'Development plan updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update development plan ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update development plan',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete development plan
   */
  deleteDevelopmentPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.developmentPlanService.deleteDevelopmentPlan(id, userId);

      logger.info('Development plan deleted successfully', { planId: id, userId });

      res.json({
        success: true,
        message: 'Development plan deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete development plan ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete development plan',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List development plans
   */
  listDevelopmentPlans = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        employeeId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        employeeId: employeeId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.developmentPlanService.listDevelopmentPlans(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list development plans', error as Error);
      res.status(500).json({
        error: 'Failed to list development plans',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update development plan progress
   */
  updatePlanProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { progress, notes } = req.body;

      const plan = await this.developmentPlanService.updatePlanProgress(id, {
        progress,
        notes,
        updatedBy: userId,
      });

      logger.info('Development plan progress updated', {
        planId: id,
        progress,
        userId,
      });

      res.json({
        success: true,
        developmentPlan: plan,
        message: 'Development plan progress updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update development plan progress ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update development plan progress',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Add activity to development plan
   */
  addActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const activityData = req.body;

      const activity = await this.developmentPlanService.addActivity(id, activityData, userId);

      logger.info('Development activity added', {
        planId: id,
        activityId: activity.id,
        title: activity.title,
        userId,
      });

      res.status(201).json({
        success: true,
        activity,
        message: 'Development activity added successfully',
      });
    } catch (error) {
      logger.error(`Failed to add development activity ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to add development activity',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update activity
   */
  updateActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, activityId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const activity = await this.developmentPlanService.updateActivity(id, activityId, updates, userId);

      logger.info('Development activity updated', {
        planId: id,
        activityId,
        userId,
      });

      res.json({
        success: true,
        activity,
        message: 'Development activity updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update development activity', error as Error );
      res.status(500).json({
        error: 'Failed to update development activity',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Complete activity
   */
  completeActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, activityId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { feedback, rating, certificateUrl } = req.body;

      const activity = await this.developmentPlanService.completeActivity(id, activityId, {
        feedback,
        rating,
        certificateUrl,
        completedBy: userId,
      });

      logger.info('Development activity completed', {
        planId: id,
        activityId,
        rating,
        userId,
      });

      res.json({
        success: true,
        activity,
        message: 'Development activity completed successfully',
      });
    } catch (error) {
      logger.error('Failed to complete development activity', error as Error);
      res.status(500).json({
        error: 'Failed to complete development activity',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get development plan statistics
   */
  getDevelopmentPlanStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { employeeId, startDate, endDate } = req.query;

      const targetEmployeeId = (employeeId as string) || userId;

      const stats = await this.developmentPlanService.getDevelopmentPlanStatistics(targetEmployeeId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        requestingUserId: userId,
      });

      res.json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      logger.error('Failed to get development plan statistics', error as Error);
      res.status(500).json({
        error: 'Failed to get development plan statistics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get team development plans overview
   */
  getTeamDevelopmentPlansOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { departmentId, page = 1, limit = 50 } = req.query;

      const options = {
        departmentId: departmentId as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        managerId: userId,
      };

      const result = await this.developmentPlanService.getTeamDevelopmentPlansOverview(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get team development plans overview', error as Error);
      res.status(500).json({
        error: 'Failed to get team development plans overview',
        message: (error as Error).message,
      });
    }
  };
}
