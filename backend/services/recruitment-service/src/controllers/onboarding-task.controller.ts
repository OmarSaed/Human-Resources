import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { OnboardingTaskService } from '../services/onboarding-task.service';

const logger = createLogger('onboarding-task-controller');

export class OnboardingTaskController {
  constructor(private onboardingTaskService: OnboardingTaskService) {}

  /**
   * Create onboarding task
   */
  createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const taskData = { ...req.body, assignedBy: userId };

      const task = await this.onboardingTaskService.createTask(taskData);

      logger.info('Onboarding task created successfully', {
        taskId: task.id,
        candidateId: task.candidateId,
        title: task.title,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        task,
        message: 'Onboarding task created successfully',
      });
    } catch (error) {
      logger.error('Failed to create onboarding task', error as Error);
      res.status(500).json({
        error: 'Failed to create onboarding task',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get task by ID
   */
  getTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const task = await this.onboardingTaskService.getTask(id, userId);

      if (!task) {
        res.status(404).json({
          error: 'Onboarding task not found',
          message: 'The requested onboarding task was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        task,
      });
    } catch (error) {
      logger.error(`Failed to get onboarding task ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve onboarding task',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update task
   */
  updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const task = await this.onboardingTaskService.updateTask(id, updates, userId);

      logger.info('Onboarding task updated successfully', {
        taskId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        task,
        message: 'Onboarding task updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update onboarding task ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update onboarding task',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete task
   */
  deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.onboardingTaskService.deleteTask(id, userId);

      logger.info('Onboarding task deleted successfully', { taskId: id, userId });

      res.json({
        success: true,
        message: 'Onboarding task deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete onboarding task ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete onboarding task',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get candidate tasks
   */
  getCandidateTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { candidateId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const tasks = await this.onboardingTaskService.getCandidateTasks(candidateId);

      res.json({
        success: true,
        tasks,
      });
    } catch (error) {
      logger.error(`Failed to get candidate tasks ${req.params.candidateId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get candidate tasks',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List tasks
   */
  listTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        candidateId,
        category,
        status,
        assignedTo,
        page = 1,
        limit = 20,
        sortBy = 'dueDate',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        candidateId: candidateId as string,
        category: category as string,
        status: status as string,
        assignedTo: assignedTo as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.onboardingTaskService.listTasks(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list onboarding tasks', error as Error);
      res.status(500).json({
        error: 'Failed to list onboarding tasks',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Complete task
   */
  completeTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { notes } = req.body;

      const task = await this.onboardingTaskService.completeTask(id, {
        completedBy: userId,
        notes,
      });

      logger.info('Onboarding task completed', {
        taskId: id,
        completedBy: userId,
      });

      res.json({
        success: true,
        task,
        message: 'Onboarding task completed successfully',
      });
    } catch (error) {
      logger.error(`Failed to complete onboarding task ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to complete onboarding task',
        message: (error as Error).message,
      });
    }
  };
}