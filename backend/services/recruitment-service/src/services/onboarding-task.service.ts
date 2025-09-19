import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { OnboardingTaskData } from '../models/shared.models';

const logger = createLogger('onboarding-task-service');


export class OnboardingTaskService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create onboarding task
   */
  async createTask(data: OnboardingTaskData): Promise<any> {
    try {
      // Validate candidate exists
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: data.candidateId },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const task = await this.prisma.onboardingTask.create({
        data: {
          candidateId: data.candidateId,
          title: data.title,
          description: data.description,
          category: data.category as any,
          type: data.type as any || 'MANUAL',
          priority: data.priority as any || 'NORMAL',
          assignedBy: data.assignedBy,
          assignedTo: data.assignedTo,
          dueDate: data.dueDate,
          estimatedHours: data.estimatedHours,
          instructions: data.instructions,
          attachments: data.attachments || [],
          dependencies: data.dependencies || [],
          isRequired: data.isRequired !== false,
          status: 'PENDING',
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      logger.info('Onboarding task created successfully', {
        taskId: task.id,
        candidateId: data.candidateId,
        title: data.title,
        category: data.category,
      });

      return task;
    } catch (error) {
      logger.error('Failed to create onboarding task', error as Error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string, requestingUserId: string): Promise<any | null> {
    try {
      const task = await this.prisma.onboardingTask.findUnique({
        where: { id: taskId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return task;
    } catch (error) {
      logger.error(`Failed to get onboarding task ${taskId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update task
   */
  async updateTask(
    taskId: string,
    updates: Partial<OnboardingTaskData>,
    requestingUserId: string
  ): Promise<any> {
    try {
      const task = await this.prisma.onboardingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('Onboarding task not found');
      }

      if (task.status === 'COMPLETED') {
        throw new Error('Cannot update completed task');
      }

      const updatedTask = await this.prisma.onboardingTask.update({
        where: { id: taskId },
        data: {
          title: updates.title,
          description: updates.description,
          category: updates.category as any,
          type: updates.type as any,
          priority: updates.priority as any,
          assignedTo: updates.assignedTo,
          dueDate: updates.dueDate,
          estimatedHours: updates.estimatedHours,
          instructions: updates.instructions,
          attachments: updates.attachments,
          dependencies: updates.dependencies,
          isRequired: updates.isRequired,
          updatedAt: new Date(),
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      logger.info('Onboarding task updated successfully', {
        taskId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedTask;
    } catch (error) {
      logger.error(`Failed to update onboarding task ${taskId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string, requestingUserId: string): Promise<void> {
    try {
      const task = await this.prisma.onboardingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('Onboarding task not found');
      }

      if (task.status === 'COMPLETED') {
        throw new Error('Cannot delete completed task');
      }

      await this.prisma.onboardingTask.delete({
        where: { id: taskId },
      });

      logger.info('Onboarding task deleted successfully', { taskId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete onboarding task ${taskId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get candidate tasks
   */
  async getCandidateTasks(candidateId: string): Promise<any[]> {
    try {
      const tasks = await this.prisma.onboardingTask.findMany({
        where: { candidateId },
        orderBy: { dueDate: 'asc' },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return tasks;
    } catch (error) {
      logger.error(`Failed to get candidate tasks ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * List tasks with filtering
   */
  async listTasks(options: {
    candidateId?: string;
    category?: string;
    status?: string;
    assignedTo?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{
    tasks: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        candidateId,
        category,
        status,
        assignedTo,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (candidateId) where.candidateId = candidateId;
      if (category) where.category = category;
      if (status) where.status = status;
      if (assignedTo) where.assignedTo = assignedTo;

      const [tasks, total] = await Promise.all([
        this.prisma.onboardingTask.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.onboardingTask.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        tasks,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list onboarding tasks', error as Error);
      throw error;
    }
  }

  /**
   * Complete task
   */
  async completeTask(taskId: string, completionData: { completedBy: string; notes?: string }): Promise<any> {
    try {
      const task = await this.prisma.onboardingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('Onboarding task not found');
      }

      if (task.status === 'COMPLETED') {
        throw new Error('Task is already completed');
      }

      const updatedTask = await this.prisma.onboardingTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      logger.info('Onboarding task completed successfully', {
        taskId,
        completedBy: completionData.completedBy,
      });

      return updatedTask;
    } catch (error) {
      logger.error('Failed to complete onboarding task', error as Error);
      throw error;
    }
  }
}