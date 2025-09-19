import { EventFactory, createLogger } from '@hrms/shared';

const logger = createLogger('kafka-producer-service');

export interface DocumentEvent {
  documentId: string;
  filename: string;
  category: string;
  type: string;
  ownerId: string;
  ownerType: string;
  size: number;
  mimeType: string;
  version?: number;
  folderId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentVersionEvent extends DocumentEvent {
  previousVersionId?: string;
  versionNumber: number;
  changes: string[];
}

export interface DocumentPermissionEvent {
  documentId: string;
  targetUserId: string;
  permission: string;
  grantedBy: string;
  expiresAt?: Date;
}

export interface DocumentWorkflowEvent {
  documentId: string;
  workflowId: string;
  templateId: string;
  stepId?: string;
  status: string;
  assigneeId?: string;
  decision?: string;
  comments?: string;
}

export class KafkaProducerService {
  constructor(private kafkaService: any) {} // Mock KafkaService for now

  /**
   * Publish document uploaded event
   */
  async publishDocumentUploaded(
    document: DocumentEvent,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.uploaded',
        'document-service',
        {
          documentId: document.documentId,
          filename: document.filename,
          category: document.category,
          type: document.type,
          ownerId: document.ownerId,
          ownerType: document.ownerType,
          size: document.size,
          mimeType: document.mimeType,
          folderId: document.folderId,
          tags: document.tags,
          metadata: document.metadata,
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document uploaded event published', {
        documentId: document.documentId,
        filename: document.filename,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document uploaded event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document updated event
   */
  async publishDocumentUpdated(
    document: DocumentEvent,
    previousValues: Partial<DocumentEvent>,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.updated',
        'document-service',
        {
          documentId: document.documentId,
          filename: document.filename,
          category: document.category,
          type: document.type,
          ownerId: document.ownerId,
          ownerType: document.ownerType,
          size: document.size,
          mimeType: document.mimeType,
          folderId: document.folderId,
          tags: document.tags,
          metadata: document.metadata,
          previousValues,
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document updated event published', {
        documentId: document.documentId,
        filename: document.filename,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document updated event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document deleted event
   */
  async publishDocumentDeleted(
    documentId: string,
    filename: string,
    ownerId: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.deleted',
        'document-service',
        {
          documentId,
          filename,
          ownerId,
          deletedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document deleted event published', {
        documentId,
        filename,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document deleted event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document version created event
   */
  async publishDocumentVersionCreated(
    document: DocumentVersionEvent,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.version.created',
        'document-service',
        {
          documentId: document.documentId,
          filename: document.filename,
          versionNumber: document.versionNumber,
          previousVersionId: document.previousVersionId,
          changes: document.changes,
          ownerId: document.ownerId,
          size: document.size,
          mimeType: document.mimeType,
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document version created event published', {
        documentId: document.documentId,
        versionNumber: document.versionNumber,
        correlationId,
      });
      } catch (error) {
        logger.error('Failed to publish document version created event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document accessed event
   */
  async publishDocumentAccessed(
    documentId: string,
    filename: string,
    accessType: 'view' | 'download',
    userId: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.accessed',
        'document-service',
        {
          documentId,
          filename,
          accessType,
          userId,
          accessedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.debug('Document accessed event published', {
        documentId,
        accessType,
        userId,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document accessed event', error as Error);
      // Don't throw for access events to avoid disrupting user experience
    }
  }

  /**
   * Publish document shared event
   */
  async publishDocumentShared(
    documentId: string,
    filename: string,
    sharedBy: string,
    sharedWith: string[],
    permission: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.shared',
        'document-service',
        {
          documentId,
          filename,
          sharedBy,
          sharedWith,
          permission,
          sharedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document shared event published', {
        documentId,
        sharedBy,
        sharedWithCount: sharedWith.length,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document shared event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document permission granted event
   */
  async publishDocumentPermissionGranted(
    permission: DocumentPermissionEvent,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.permission.granted',
        'document-service',
        {
          documentId: permission.documentId,
          targetUserId: permission.targetUserId,
          permission: permission.permission,
          grantedBy: permission.grantedBy,
          expiresAt: permission.expiresAt,
          grantedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document permission granted event published', {
        documentId: permission.documentId,
        targetUserId: permission.targetUserId,
        permission: permission.permission,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document permission granted event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document permission revoked event
   */
  async publishDocumentPermissionRevoked(
    documentId: string,
    targetUserId: string,
    permission: string,
    revokedBy: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.permission.revoked',
        'document-service',
        {
          documentId,
          targetUserId,
          permission,
          revokedBy,
          revokedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document permission revoked event published', {
        documentId,
        targetUserId,
        permission,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document permission revoked event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document workflow started event
   */
  async publishDocumentWorkflowStarted(
    workflow: DocumentWorkflowEvent,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.workflow.started',
        'document-service',
        {
          documentId: workflow.documentId,
          workflowId: workflow.workflowId,
          templateId: workflow.templateId,
          status: workflow.status,
          assigneeId: workflow.assigneeId,
          startedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document workflow started event published', {
        documentId: workflow.documentId,
        workflowId: workflow.workflowId,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document workflow started event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document workflow completed event
   */
  async publishDocumentWorkflowCompleted(
    workflow: DocumentWorkflowEvent,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.workflow.completed',
        'document-service',
        {
          documentId: workflow.documentId,
          workflowId: workflow.workflowId,
          templateId: workflow.templateId,
          status: workflow.status,
          decision: workflow.decision,
          comments: workflow.comments,
          completedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document workflow completed event published', {
        documentId: workflow.documentId,
        workflowId: workflow.workflowId,
        decision: workflow.decision,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document workflow completed event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document archived event
   */
  async publishDocumentArchived(
    documentId: string,
    filename: string,
    archivedBy: string,
    reason: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.archived',
        'document-service',
        {
          documentId,
          filename,
          archivedBy,
          reason,
          archivedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document archived event published', {
        documentId,
        filename,
        reason,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document archived event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document restored event
   */
  async publishDocumentRestored(
    documentId: string,
    filename: string,
    restoredBy: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.restored',
        'document-service',
        {
          documentId,
          filename,
          restoredBy,
          restoredAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document restored event published', {
        documentId,
        filename,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish document restored event', error as Error);
      throw error;
    }
  }

  /**
   * Publish folder created event
   */
  async publishFolderCreated(
    folderId: string,
    name: string,
    parentId: string | null,
    createdBy: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'folder.created',
        'document-service',
        {
          folderId,
          name,
          parentId,
          createdBy,
          createdAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Folder created event published', {
        folderId,
        name,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish folder created event', error as Error);
      throw error;
    }
  }

  /**
   * Publish document retention policy applied event
   */
  async publishRetentionPolicyApplied(
    documentId: string,
    policyId: string,
    retentionDate: Date,
    action: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.retention.applied',
        'document-service',
        {
          documentId,
          policyId,
          retentionDate,
          action,
          appliedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.info('Document retention policy applied event published', {
        documentId,
        policyId,
        action,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish retention policy applied event', error as Error);
      throw error;
    }
  }

  /**
   * Publish search executed event
   */
  async publishSearchExecuted(
    query: string,
    userId: string,
    resultCount: number,
    filters: Record<string, any>,
    correlationId?: string
  ): Promise<void> {
    try {
      const event = EventFactory.createEvent(
        'document.search.executed',
        'document-service',
        {
          query,
          userId,
          resultCount,
          filters,
          searchedAt: new Date(),
        },
        correlationId
      );

      await this.kafkaService.getProducer().publishEvent('document-events', event);

      logger.debug('Document search executed event published', {
        query,
        userId,
        resultCount,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish search executed event', error as Error);
      // Don't throw for search events to avoid disrupting user experience
    }
  }
}
