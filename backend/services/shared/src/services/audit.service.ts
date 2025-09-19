import { createLogger } from '../utils/logger';
import { EventFactory, SYSTEM_EVENT_TYPES } from '../index';

const logger = createLogger('audit-service');

export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Shared Audit Service for logging actions across all microservices
 */
export class AuditService {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Log an action performed by a user
   */
  async logAction(data: AuditLogData): Promise<void> {
    try {
      const auditEntry = {
        ...data,
        serviceName: this.serviceName,
        timestamp: new Date(),
        id: this.generateAuditId()
      };

      // Log locally
      logger.info('Audit log created', auditEntry);

      // Publish audit event to Kafka for centralized audit logging
      await EventFactory.publishEvent(
        SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED,
        auditEntry,
        this.serviceName
      );
    } catch (error) {
      logger.error('Failed to log audit action', error as Error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthentication(userId: string, action: 'login' | 'logout' | 'failed_login', metadata?: Record<string, any>): Promise<void> {
    await this.logAction({
      entityType: 'user',
      entityId: userId,
      action: `auth.${action}`,
      userId,
      metadata
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(entityType: string, entityId: string, userId: string, action: 'read' | 'search', metadata?: Record<string, any>): Promise<void> {
    await this.logAction({
      entityType,
      entityId,
      action: `data.${action}`,
      userId,
      metadata
    });
  }

  /**
   * Log CRUD operations
   */
  async logCRUD(entityType: string, entityId: string, userId: string, action: 'create' | 'update' | 'delete', changes?: Record<string, any>, metadata?: Record<string, any>): Promise<void> {
    await this.logAction({
      entityType,
      entityId,
      action: `crud.${action}`,
      userId,
      changes,
      metadata
    });
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(userId: string, targetUserId: string, action: string, changes: Record<string, any>): Promise<void> {
    await this.logAction({
      entityType: 'user_permissions',
      entityId: targetUserId,
      action: `permission.${action}`,
      userId,
      changes,
      metadata: {
        targetUserId
      }
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType: string, userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.logAction({
      entityType: 'security',
      entityId: `security-${Date.now()}`,
      action: `security.${eventType}`,
      userId,
      metadata
    });
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${this.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
