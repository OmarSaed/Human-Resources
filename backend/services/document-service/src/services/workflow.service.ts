import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('workflow-service');

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  type: 'approval' | 'review' | 'notification' | 'action';
  assigneeType: 'user' | 'role' | 'department' | 'system';
  assigneeId: string;
  order: number;
  isRequired: boolean;
  timeoutHours?: number;
  autoApprove?: boolean;
  conditions?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  documentCategory?: string;
  documentType?: string;
  trigger: 'upload' | 'update' | 'review' | 'expiry' | 'manual';
  steps: WorkflowStep[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  documentId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'CANCELLED';
  currentStepId?: string;
  initiatedBy: string;
  initiatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowStepExecution {
  id: string;
  instanceId: string;
  stepId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  assigneeId: string;
  assignedAt: Date;
  completedAt?: Date;
  completedBy?: string;
  decision?: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  metadata?: Record<string, any>;
}

export class WorkflowService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create workflow template
   */
  async createTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt'>): Promise<WorkflowTemplate> {
    try {
      const result = await this.prisma.workflowTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          documentCategory: template.documentCategory as any,
          documentType: template.documentType as any,
          trigger: template.trigger,
          isActive: template.isActive,
          createdBy: template.createdBy,
          steps: JSON.stringify(template.steps),
        },
      });

      logger.info('Workflow template created', { 
        templateId: result.id,
        name: template.name 
      });

      return {
        ...result,
        steps: JSON.parse(result.steps as string),
      } as WorkflowTemplate;
    } catch (error) {
      logger.error('Failed to create workflow template', error as Error);
      throw error;
    }
  }

  /**
   * Get workflow template by ID
   */
  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    try {
      const template = await this.prisma.workflowTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return null;
      }

      return {
        ...template,
        steps: JSON.parse(template.steps as string),
      } as WorkflowTemplate;
    } catch (error) {
      logger.error('Failed to get workflow template', error as Error);
      throw error;
    }
  }

  /**
   * Get templates by trigger and document criteria
   */
  async getTemplatesByTrigger(
    trigger: string,
    documentCategory?: string,
    documentType?: string
  ): Promise<WorkflowTemplate[]> {
    try {
      const templates = await this.prisma.workflowTemplate.findMany({
        where: {
          trigger,
          isActive: true,
          ...(documentCategory && { documentCategory: documentCategory as any }),
          ...(documentType && { documentType: documentType as any }),
        },
        orderBy: { createdAt: 'desc' },
      });

      return templates.map(template => ({
        ...template,
        steps: JSON.parse(template.steps as string),
      })) as WorkflowTemplate[];
    } catch (error) {
      logger.error('Failed to get templates by trigger', error as Error);
      throw error;
    }
  }

  /**
   * Start workflow instance
   */
  async startWorkflow(
    templateId: string,
    documentId: string,
    initiatedBy: string,
    metadata?: Record<string, any>
  ): Promise<WorkflowInstance> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Workflow template not found');
      }

      if (!template.isActive) {
        throw new Error('Workflow template is not active');
      }

      const instance = await this.prisma.workflowInstance.create({
        data: {
          templateId,
          documentId,
          status: 'PENDING',
          initiatedBy,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });

      // Create step executions for all steps
      const stepExecutions = template.steps.map((step, index) => ({
        instanceId: instance.id,
        stepId: step.id,
        stepIndex: index,
        status: 'PENDING' as const,
        assigneeId: step.assigneeId,
        assignedAt: new Date(),
      }));

      await this.prisma.workflowStepExecution.createMany({
        data: stepExecutions,
      });

      // Start the first step
      await this.startNextStep(instance.id);

      logger.info('Workflow instance started', {
        instanceId: instance.id,
        templateId,
        documentId,
        initiatedBy
      });

      return {
        ...instance,
        metadata: instance.metadata ? JSON.parse(instance.metadata as string) : undefined,
      } as WorkflowInstance;
    } catch (error) {
      logger.error('Failed to start workflow', error as Error);
      throw error;
    }
  }

  /**
   * Complete workflow step
   */
  async completeStep(
    stepExecutionId: string,
    completedBy: string,
    decision: 'approve' | 'reject' | 'request_changes',
    comments?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const stepExecution = await this.prisma.workflowStepExecution.findUnique({
        where: { id: stepExecutionId },
        include: { instance: true },
      });

      if (!stepExecution) {
        throw new Error('Workflow step execution not found');
      }

      if (stepExecution.status !== 'IN_PROGRESS') {
        throw new Error('Step is not in progress');
      }

      // Update step execution
      await this.prisma.workflowStepExecution.update({
        where: { id: stepExecutionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy,
          decision,
          comments,
        },
      });

      logger.info('Workflow step completed', {
        stepExecutionId,
        instanceId: stepExecution.instanceId,
        decision,
        completedBy
      });

      // Handle decision
      if (decision === 'reject') {
        await this.cancelWorkflow(stepExecution.instanceId, `Rejected at step ${stepExecution.stepId}`);
      } else if (decision === 'approve') {
        await this.startNextStep(stepExecution.instanceId);
      }
      // For 'request_changes', the workflow remains in current state
    } catch (error) {
      logger.error('Failed to complete workflow step', error as Error);
      throw error;
    }
  }

  /**
   * Start next step in workflow
   */
  private async startNextStep(instanceId: string): Promise<void> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      const template = await this.getTemplate(instance.templateId);
      if (!template) {
        throw new Error('Workflow template not found');
      }

      // Get all step executions for this instance
      const stepExecutions = await this.prisma.workflowStepExecution.findMany({
        where: { instanceId },
        orderBy: { assignedAt: 'asc' },
      });

      // Find next pending step
      const currentStepIndex = stepExecutions.findIndex(se => 
        se.status === 'COMPLETED' || se.status === 'CANCELLED'
      );

      const nextStepIndex = currentStepIndex + 1;
      
      if (nextStepIndex >= stepExecutions.length) {
        // No more steps, complete the workflow
        await this.completeWorkflow(instanceId);
        return;
      }

      const nextStepExecution = stepExecutions[nextStepIndex];
      const nextStep = template.steps.find(s => s.id === nextStepExecution.stepId);

      if (!nextStep) {
        throw new Error('Next step not found in template');
      }

      // Start the next step
      await this.prisma.workflowStepExecution.update({
        where: { id: nextStepExecution.id },
        data: {
          status: 'IN_PROGRESS',
          assignedAt: new Date(),
        },
      });

      // Update instance current step
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'IN_PROGRESS',
          currentStep: parseInt(nextStep.id) || 0,
        },
      });

      logger.info('Next workflow step started', {
        instanceId,
        stepId: nextStep.id,
        assigneeId: nextStep.assigneeId
      });

      // Send notification to assignee (if notification service is available)
      await this.sendStepNotification(nextStepExecution.id, nextStep);
    } catch (error) {
      logger.error('Failed to start next workflow step', error as Error);
      throw error;
    }
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(instanceId: string): Promise<void> {
    try {
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          currentStep: 0,
        },
      });

      logger.info('Workflow completed', { instanceId });
    } catch (error) {
      logger.error('Failed to complete workflow', error as Error);
      throw error;
    }
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(instanceId: string, reason?: string): Promise<void> {
    try {
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          metadata: reason ? JSON.stringify({ cancellationReason: reason }) : undefined,
        },
      });

      // Cancel all pending step executions
      await this.prisma.workflowStepExecution.updateMany({
        where: {
          instanceId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: {
          status: 'SKIPPED',
          completedAt: new Date(),
        },
      });

      logger.info('Workflow cancelled', { instanceId, reason });
    } catch (error) {
      logger.error('Failed to cancel workflow', error as Error);
      throw error;
    }
  }

  /**
   * Get workflow instance
   */
  async getInstance(instanceId: string): Promise<WorkflowInstance | null> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        return null;
      }

      return {
        ...instance,
        metadata: instance.metadata ? JSON.parse(instance.metadata as string) : undefined,
      } as WorkflowInstance;
    } catch (error) {
      logger.error('Failed to get workflow instance', error as Error);
      throw error;
    }
  }

  /**
   * Get workflow instances for document
   */
  async getInstancesForDocument(documentId: string): Promise<WorkflowInstance[]> {
    try {
      const instances = await this.prisma.workflowInstance.findMany({
        where: { documentId },
        orderBy: { initiatedAt: 'desc' },
      });

      return instances.map(instance => ({
        ...instance,
        metadata: instance.metadata ? JSON.parse(instance.metadata as string) : undefined,
      })) as WorkflowInstance[];
    } catch (error) {
      logger.error('Failed to get workflow instances for document', error as Error);
      throw error;
    }
  }

  /**
   * Get pending workflow tasks for user
   */
  async getPendingTasks(assigneeId: string): Promise<Array<WorkflowStepExecution & { 
    instance: WorkflowInstance;
    template: WorkflowTemplate;
  }>> {
    try {
      const stepExecutions = await this.prisma.workflowStepExecution.findMany({
        where: {
          assigneeId,
          status: 'IN_PROGRESS',
        },
        include: {
          instance: true,
        },
        orderBy: { assignedAt: 'asc' },
      });

      const tasksWithTemplates = await Promise.all(
        stepExecutions.map(async (stepExecution) => {
          const template = await this.getTemplate(stepExecution.instance.templateId);
          return {
            ...stepExecution,
            instance: {
              ...stepExecution.instance,
              metadata: stepExecution.instance.metadata 
                ? JSON.parse(stepExecution.instance.metadata as string) 
                : undefined,
            } as WorkflowInstance,
            template: template!,
          };
        })
      );

      return tasksWithTemplates.map(task => ({
        ...task,
        completedAt: task.completedAt || undefined,
      })) as any;
    } catch (error) {
      logger.error('Failed to get pending tasks', error as Error);
      throw error;
    }
  }

  /**
   * Send step notification
   */
  private async sendStepNotification(stepExecutionId: string, step: WorkflowStep): Promise<void> {
    try {
      // This would integrate with the notification service
      // For now, just log the notification
      logger.info('Workflow step notification sent', {
        stepExecutionId,
        stepName: step.name,
        assigneeId: step.assigneeId,
        assigneeType: step.assigneeType
      });
    } catch (error) {
      logger.warn('Failed to send step notification', error as Error);
      // Don't throw error for notification failures
    }
  }

  /**
   * Auto-approve workflows based on conditions
   */
  async processAutoApprovals(): Promise<void> {
    try {
      const pendingSteps = await this.prisma.workflowStepExecution.findMany({
        where: {
          status: 'IN_PROGRESS',
        },
        include: {
          instance: true,
        },
      });

      for (const stepExecution of pendingSteps) {
        const template = await this.getTemplate(stepExecution.instance.templateId);
        if (!template) continue;

        const step = template.steps.find(s => s.id === stepExecution.stepId);
        if (!step || !step.autoApprove) continue;

        // Check if step should be auto-approved based on conditions
        const shouldAutoApprove = await this.evaluateAutoApprovalConditions(
          step,
          stepExecution.instance.documentId
        );

        if (shouldAutoApprove) {
          await this.completeStep(
            stepExecution.id,
            'system',
            'approve',
            'Auto-approved based on predefined conditions'
          );

          logger.info('Step auto-approved', {
            stepExecutionId: stepExecution.id,
            instanceId: stepExecution.instanceId
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process auto-approvals', error as Error);
    }
  }

  /**
   * Evaluate auto-approval conditions
   */
  private async evaluateAutoApprovalConditions(
    step: WorkflowStep,
    documentId: string
  ): Promise<boolean> {
    try {
      if (!step.conditions) {
        return true; // No conditions, auto-approve
      }

      // Implement condition evaluation logic based on document properties
      // This is a simplified example
      return false;
    } catch (error) {
      logger.error('Failed to evaluate auto-approval conditions', error as Error);
      return false;
    }
  }
}
