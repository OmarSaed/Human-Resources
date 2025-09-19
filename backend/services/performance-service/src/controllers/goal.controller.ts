import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { GoalService } from '../services/goal.service';

const logger = createLogger('goal-controller');

export class GoalController {
  constructor(private goalService: GoalService) {}

  /**
   * Create a new goal
   */
  createGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const goalData = req.body;

      const goal = await this.goalService.createGoal({
        ...goalData,
        employeeId: goalData.employeeId || userId,
        createdBy: userId,
      });

      logger.info('Goal created successfully', {
        goalId: goal.id,
        title: goal.title,
        employeeId: goal.employeeId,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        goal,
        message: 'Goal created successfully',
      });
    } catch (error) {
      logger.error('Failed to create goal', error as Error);
      res.status(500).json({
        error: 'Failed to create goal',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get goal by ID
   */
  getGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const goal = await this.goalService.getGoal(id, userId);

      if (!goal) {
        res.status(404).json({
          error: 'Goal not found',
          message: 'The requested goal was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        goal,
      });
    } catch (error) {
      logger.error(`Failed to get goal ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve goal',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update goal
   */
  updateGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const goal = await this.goalService.updateGoal(id, updates, userId);

      logger.info('Goal updated successfully', {
        goalId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        goal,
        message: 'Goal updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update goal ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update goal',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete goal
   */
  deleteGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.goalService.deleteGoal(id, userId);

      logger.info('Goal deleted successfully', { goalId: id, userId });

      res.json({
        success: true,
        message: 'Goal deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete goal ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete goal',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List goals
   */
  listGoals = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        employeeId,
        status,
        category,
        priority,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        employeeId: (employeeId as string) || userId,
        status: status as string,
        category: category as string,
        priority: priority as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.goalService.listGoals(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list goals', error as Error);
      res.status(500).json({
        error: 'Failed to list goals',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update goal progress
   */
  updateGoalProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { progress, notes, milestones } = req.body;

      const goal = await this.goalService.updateGoalProgress(id, {
        progress,
        notes,
        milestones,
        updatedBy: userId,
      });

      logger.info('Goal progress updated', {
        goalId: id,
        progress,
        userId,
      });

      res.json({
        success: true,
        goal,
        message: 'Goal progress updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update goal progress ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update goal progress',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Complete goal
   */
  completeGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { completionNotes, actualEndDate } = req.body;

      const goal = await this.goalService.completeGoal(id, userId, {
        completionNotes,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
      });

      logger.info('Goal completed', { goalId: id, userId });

      res.json({
        success: true,
        goal,
        message: 'Goal marked as completed',
      });
    } catch (error) {
      logger.error(`Failed to complete goal ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to complete goal',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get goal statistics
   */
  getGoalStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { employeeId, startDate, endDate } = req.query;

      const targetEmployeeId = (employeeId as string) || userId;

      const stats = await this.goalService.getGoalStatistics(targetEmployeeId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        requestingUserId: userId,
      });

      res.json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      logger.error('Failed to get goal statistics', error as Error);
      res.status(500).json({
        error: 'Failed to get goal statistics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get team goals overview
   */
  getTeamGoalsOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { departmentId, page = 1, limit = 50 } = req.query;

      const options = {
        departmentId: departmentId as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        managerId: userId,
      };

      const result = await this.goalService.getTeamGoalsOverview(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get team goals overview', error as Error);
      res.status(500).json({
        error: 'Failed to get team goals overview',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Add goal comment
   */
  addGoalComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { content, isPrivate = false } = req.body;

      const comment = await this.goalService.addGoalComment(id, {
        content,
        authorId: userId,
        isPrivate,
      });

      logger.info('Goal comment added', {
        goalId: id,
        commentId: comment.id,
        authorId: userId,
      });

      res.status(201).json({
        success: true,
        comment,
        message: 'Comment added successfully',
      });
    } catch (error) {
      logger.error(`Failed to add goal comment ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to add goal comment',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get goal comments
   */
  getGoalComments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { page = 1, limit = 20 } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        requestingUserId: userId,
      };

      const result = await this.goalService.getGoalComments(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get goal comments ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get goal comments',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Align goals (link parent/child goals)
   */
  alignGoals = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { parentGoalId, childGoalIds, alignmentType } = req.body;

      const result = await this.goalService.alignGoals(id, {
        parentGoalId,
        childGoalIds,
        alignmentType,
        alignedBy: userId,
      });

      logger.info('Goals aligned', {
        mainGoalId: id,
        parentGoalId,
        childGoalIds,
        userId,
      });

      res.json({
        success: true,
        alignment: result,
        message: 'Goals aligned successfully',
      });
    } catch (error) {
      logger.error(`Failed to align goals ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to align goals',
        message: (error as Error).message,
      });
    }
  };
}
