import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { StorageService } from './storage.service';
import { AuditService } from '@hrms/shared';

const logger = createLogger('retention-service');

export interface RetentionPolicy {
  id: string;
  name: string;
  description?: string;
  documentCategory?: string;
  documentType?: string;
  retentionPeriodDays: number;
  action: 'delete' | 'archive' | 'review';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  conditions?: RetentionCondition[];
}

export interface RetentionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface RetentionJob {
  id: string;
  policyId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  documentCount: number;
  processedCount: number;
  failedCount: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  dryRun: boolean;
}

export interface RetentionSummary {
  totalPolicies: number;
  activePolicies: number;
  documentsScheduledForDeletion: number;
  documentsScheduledForArchive: number;
  documentsScheduledForReview: number;
  nextRunDate?: Date;
  lastRunDate?: Date;
}

export interface DocumentRetentionInfo {
  documentId: string;
  policyId?: string;
  policyName?: string;
  retentionDate?: Date;
  action?: 'delete' | 'archive' | 'review';
  daysUntilAction?: number;
  isOnLegalHold: boolean;
}

export class RetentionService {
  constructor(
    private prisma: PrismaClient,
    private storageService: StorageService,
    private auditService: AuditService
  ) {}

  /**
   * Create retention policy
   */
  async createPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<RetentionPolicy> {
    try {
      const result = await this.prisma.retentionPolicy.create({
        data: {
          name: policy.name,
          action: policy.action.toUpperCase() as any,
          retentionPeriod: policy.retentionPeriodDays,
          retentionPeriodDays: policy.retentionPeriodDays,
          description: policy.description,
          isActive: policy.isActive,
          createdBy: policy.createdBy,
          conditions: policy.conditions ? JSON.stringify(policy.conditions) : undefined,
        },
      });

      logger.info('Retention policy created', {
        policyId: result.id,
        name: policy.name,
        retentionPeriod: policy.retentionPeriodDays,
      });

      return {
        ...result,
        conditions: result.conditions ? JSON.parse(result.conditions as string) : undefined,
      } as any; // Type casting to avoid enum mismatch
    } catch (error) {
      logger.error('Failed to create retention policy', error as Error);
      throw error;
    }
  }

  /**
   * Update retention policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<RetentionPolicy> {
    try {
      const result = await this.prisma.retentionPolicy.update({
        where: { id: policyId },
        data: {
          name: updates.name,
          action: updates.action?.toUpperCase() as any,
          retentionPeriod: updates.retentionPeriodDays,
          retentionPeriodDays: updates.retentionPeriodDays,
          description: updates.description,
          isActive: updates.isActive,
          createdBy: updates.createdBy,
          conditions: updates.conditions ? JSON.stringify(updates.conditions) : undefined,
          updatedAt: new Date(),
        },
      });

      logger.info('Retention policy updated', { policyId });

      return {
        ...result,
        conditions: result.conditions ? JSON.parse(result.conditions as string) : undefined,
      } as any; // Type casting to avoid enum mismatch
    } catch (error) {
      logger.error('Failed to update retention policy', error as Error);
      throw error;
    }
  }

  /**
   * Delete retention policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    try {
      // Remove policy assignment from documents
      await this.prisma.document.updateMany({
        where: { retentionPolicy: policyId },
        data: { retentionPolicy: null, retentionDate: null },
      });

      // Delete the policy
      await this.prisma.retentionPolicy.delete({
        where: { id: policyId },
      });

      logger.info('Retention policy deleted', { policyId });
    } catch (error) {
      logger.error('Failed to delete retention policy', error as Error);
      throw error;
    }
  }

  /**
   * Get retention policy
   */
  async getPolicy(policyId: string): Promise<RetentionPolicy | null> {
    try {
      const policy = await this.prisma.retentionPolicy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        return null;
      }

      return {
        ...policy,
        conditions: policy.conditions ? JSON.parse(policy.conditions as string) : undefined,
      } as any; // Type casting to avoid enum mismatch
    } catch (error) {
      logger.error('Failed to get retention policy', error as Error);
      throw error;
    }
  }

  /**
   * List retention policies
   */
  async listPolicies(activeOnly: boolean = false): Promise<RetentionPolicy[]> {
    try {
      const policies = await this.prisma.retentionPolicy.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      return policies.map(policy => ({
        ...policy,
        conditions: policy.conditions ? JSON.parse(policy.conditions as string) : undefined,
      })) as any; // Type casting to avoid enum mismatch
    } catch (error) {
      logger.error('Failed to list retention policies', error as Error);
      throw error;
    }
  }

  /**
   * Apply retention policies to documents
   */
  async applyPolicies(dryRun: boolean = false): Promise<RetentionJob> {
    const jobId = `retention_job_${Date.now()}`;
    
    try {
      const job = await this.prisma.retentionJob.create({
        data: {
          id: jobId,
          policyId: 'bulk_apply',
          status: 'PENDING',
          documentCount: 0,
          processedCount: 0,
          failedCount: 0,
          startedAt: new Date(),
          dryRun,
        },
      });

      // Run policy application asynchronously
      this.runPolicyApplication(jobId, dryRun).catch(error => {
        logger.error('Policy application failed', error as Error);
      });

      return job as any; // Type casting to avoid enum mismatch
    } catch (error) {
      logger.error('Failed to start retention policy application', error as Error);
      throw error;
    }
  }

  /**
   * Run retention policy application
   */
  private async runPolicyApplication(jobId: string, dryRun: boolean): Promise<void> {
    try {
      await this.prisma.retentionJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING' },
      });

      const policies = await this.listPolicies(true);
      let totalProcessed = 0;
      let totalFailed = 0;

      for (const policy of policies) {
        try {
          const documents = await this.findDocumentsForPolicy(policy);
          
          await this.prisma.retentionJob.update({
            where: { id: jobId },
            data: { documentCount: documents.length },
          });

          for (const document of documents) {
            try {
              if (!dryRun) {
                await this.applyPolicyToDocument(document.id, policy);
              }
              totalProcessed++;
            } catch (error) {
              logger.error('Failed to apply policy to document', error as Error);
              totalFailed++;
            }

            // Update progress
            await this.prisma.retentionJob.update({
              where: { id: jobId },
              data: {
                processedCount: totalProcessed,
                failedCount: totalFailed,
              },
            });
          }
        } catch (error) {
          logger.error('Failed to process policy', error as Error);
          totalFailed++;
        }
      }

      await this.prisma.retentionJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          processedCount: totalProcessed,
          failedCount: totalFailed,
        },
      });

      logger.info('Retention policy application completed', {
        jobId,
        totalProcessed,
        totalFailed,
        dryRun,
      });
    } catch (error) {
      await this.prisma.retentionJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errors: { message: (error as Error).message },
        },
      });
      throw error;
    }
  }

  /**
   * Find documents that match a retention policy
   */
  private async findDocumentsForPolicy(policy: RetentionPolicy): Promise<any[]> {
    const where: any = {};

    // Filter by category and type
    if (policy.documentCategory) {
      where.category = policy.documentCategory;
    }
    if (policy.documentType) {
      where.type = policy.documentType;
    }

    // Only consider documents that don't already have a retention policy
    // or have an older/less restrictive policy
    where.OR = [
      { retentionPolicy: null },
      { retentionPolicy: { not: policy.id } },
    ];

    // Additional conditions
    if (policy.conditions && policy.conditions.length > 0) {
      for (const condition of policy.conditions) {
        this.applyConditionToWhere(where, condition);
      }
    }

    return await this.prisma.document.findMany({
      where,
      select: {
        id: true,
        filename: true,
        category: true,
        type: true,
        createdAt: true,
        retentionPolicy: true,
        retentionDate: true,
      },
    });
  }

  /**
   * Apply retention condition to Prisma where clause
   */
  private applyConditionToWhere(where: any, condition: RetentionCondition): void {
    switch (condition.operator) {
      case 'equals':
        where[condition.field] = condition.value;
        break;
      case 'not_equals':
        where[condition.field] = { not: condition.value };
        break;
      case 'contains':
        where[condition.field] = { contains: condition.value };
        break;
      case 'not_contains':
        where[condition.field] = { not: { contains: condition.value } };
        break;
      case 'greater_than':
        where[condition.field] = { gt: condition.value };
        break;
      case 'less_than':
        where[condition.field] = { lt: condition.value };
        break;
    }
  }

  /**
   * Apply retention policy to a specific document
   */
  private async applyPolicyToDocument(documentId: string, policy: RetentionPolicy): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + policy.retentionPeriodDays);

    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        retentionPolicy: policy.id,
        retentionDate,
      },
    });

    logger.debug('Retention policy applied to document', {
      documentId,
      policyId: policy.id,
      retentionDate,
        action: policy.action.toUpperCase() as any,
    });
  }

  /**
   * Process documents due for retention action
   */
  async processRetentionActions(dryRun: boolean = false): Promise<{
    deleted: number;
    archived: number;
    reviewed: number;
    failed: number;
  }> {
    const results = {
      deleted: 0,
      archived: 0,
      reviewed: 0,
      failed: 0,
    };

    try {
      const now = new Date();
      const documentsForAction = await this.prisma.document.findMany({
        where: {
          retentionDate: { lte: now },
          isDeleted: false,
          legalHold: false, // Don't process documents on legal hold
        },
        include: {
          // retentionPolicyData: true, // Property doesn't exist"
        },
      });

      logger.info('Processing retention actions', {
        documentCount: documentsForAction.length,
        dryRun,
      });

      for (const document of documentsForAction) {
        try {
          const policy = await this.getPolicy(document.retentionPolicy!);
          if (!policy) {
            logger.warn('Retention policy not found for document', {
              documentId: document.id,
              policyId: document.retentionPolicy,
            });
            continue;
          }

          if (!dryRun) {
            switch (policy.action) {
              case 'delete':
                await this.deleteDocument(document.id);
                results.deleted++;
                break;
              case 'archive':
                await this.archiveDocument(document.id);
                results.archived++;
                break;
              case 'review':
                await this.markForReview(document.id);
                results.reviewed++;
                break;
            }
          } else {
            // Dry run - just count what would happen
            switch (policy.action) {
              case 'delete':
                results.deleted++;
                break;
              case 'archive':
                results.archived++;
                break;
              case 'review':
                results.reviewed++;
                break;
            }
          }

          logger.debug('Retention action processed', {
            documentId: document.id,
            action: policy.action.toUpperCase() as any,
            dryRun,
          });
        } catch (error) {
          logger.error('Failed to process retention action for document', error as Error);
          results.failed++;
        }
      }

      logger.info('Retention actions completed', { results, dryRun });
      return results;
    } catch (error) {
      logger.error('Failed to process retention actions', error as Error);
      throw error;
    }
  }

  /**
   * Delete document as part of retention
   */
  private async deleteDocument(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete from storage
    await this.storageService.deleteFile(document.storagePath);

    // Mark as deleted in database
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Log audit event
    await this.auditService.logCRUD(
      'document',
      documentId,
      'system',
      'delete',
      undefined,
      { reason: 'retention_policy' }
    );
  }

  /**
   * Archive document as part of retention
   */
  private async archiveDocument(documentId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        status: 'REVIEW_REQUIRED',
        reviewRequiredAt: new Date(),
      },
    });

    // Log audit event
    await this.auditService.logAction({
      entityType: 'document',
      entityId: documentId,
      action: 'archived_retention',
      userId: 'system',
      metadata: { reason: 'retention_policy' }
    });
  }

  /**
   * Mark document for review
   */
  private async markForReview(documentId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'REVIEW_REQUIRED',
        reviewRequiredAt: new Date(),
      },
    });

    // Log audit event
    await this.auditService.logAction({
      entityType: 'document',
      entityId: documentId,
      action: 'review_required',
      userId: 'system',
      metadata: { reason: 'retention_policy_review' }
    });
  }

  /**
   * Get retention summary
   */
  async getRetentionSummary(): Promise<RetentionSummary> {
    try {
      const now = new Date();

      const [
        totalPolicies,
        activePolicies,
        documentsForDeletion,
        documentsForArchive,
        documentsForReview,
        lastJob
      ] = await Promise.all([
        this.prisma.retentionPolicy.count(),
        this.prisma.retentionPolicy.count({ where: { isActive: true } }),
        this.prisma.document.count({
          where: {
            retentionDate: { lte: now },
            isDeleted: false,
            legalHold: false
          },
        }),
        this.prisma.document.count({
          where: {
            retentionDate: { lte: now },
            isDeleted: false,
            legalHold: false
          },
        }),
        this.prisma.document.count({
          where: {
            retentionDate: { lte: now },
            isDeleted: false,
            legalHold: false
          },
        }),
        this.prisma.retentionJob.findFirst({
          orderBy: { startedAt: 'desc' },
        }),
      ]);

      return {
        totalPolicies,
        activePolicies,
        documentsScheduledForDeletion: documentsForDeletion,
        documentsScheduledForArchive: documentsForArchive,
        documentsScheduledForReview: documentsForReview,
        lastRunDate: lastJob?.startedAt,
      };
    } catch (error) {
      logger.error('Failed to get retention summary', error as Error);
      throw error;
    }
  }

  /**
   * Get document retention information
   */
  async getDocumentRetentionInfo(documentId: string): Promise<DocumentRetentionInfo> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          // retentionPolicyData: true, // Property doesn't exist"
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      const info: DocumentRetentionInfo = {
        documentId,
        isOnLegalHold: document.legalHold,
      };

      if (document.retentionPolicy && document.retentionDate) {
        const policy = await this.getPolicy(document.retentionPolicy);
        const now = new Date();
        const retentionDate = new Date(document.retentionDate);
        const daysUntilAction = Math.ceil((retentionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        info.policyId = document.retentionPolicy;
        info.policyName = policy?.name;
        info.retentionDate = retentionDate;
        info.action = policy?.action;
        info.daysUntilAction = daysUntilAction;
      }

      return info;
    } catch (error) {
      logger.error('Failed to get document retention info', error as Error);
      throw error;
    }
  }

  /**
   * Set legal hold on document
   */
  async setLegalHold(documentId: string, userId: string, reason: string): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          legalHold: true,
          legalHoldReason: reason,
          legalHoldAt: new Date(),
          legalHoldBy: userId,
        },
      });

      await this.auditService.logAction({
        entityType: 'document',
        entityId: documentId,
        action: 'legal_hold_set',
        userId,
        metadata: { reason }
      });

      logger.info('Legal hold set on document', { documentId, userId, reason });
    } catch (error) {
      logger.error('Failed to set legal hold', error as Error);
      throw error;
    }
  }

  /**
   * Remove legal hold from document
   */
  async removeLegalHold(documentId: string, userId: string): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          legalHold: false,
          legalHoldReason: null,
          legalHoldAt: null,
          legalHoldBy: null,
        },
      });

      await this.auditService.logAction({
        entityType: 'document',
        entityId: documentId,
        action: 'legal_hold_removed',
        userId,
        metadata: { reason: 'Legal hold removed' }
      });

      logger.info('Legal hold removed from document', { documentId, userId });
    } catch (error) {
      logger.error('Failed to remove legal hold', error as Error);
      throw error;
    }
  }
}
