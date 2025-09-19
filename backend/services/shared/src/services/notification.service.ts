import { createLogger } from '../utils/logger';
import { EventFactory, SYSTEM_EVENT_TYPES } from '../index';

const logger = createLogger('notification-service');

export interface NotificationData {
  recipientId: string;
  recipientEmail?: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  template: string;
  subject?: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sendAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Shared Notification Service for sending notifications across all microservices
 */
export class NotificationService {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Send a notification
   */
  async sendNotification(notification: NotificationData): Promise<void> {
    try {
      const notificationPayload = {
        ...notification,
        id: this.generateNotificationId(),
        serviceName: this.serviceName,
        createdAt: new Date()
      };

      // Log notification request
      logger.info('Sending notification', {
        id: notificationPayload.id,
        type: notification.type,
        template: notification.template,
        recipientId: notification.recipientId
      });

      // Publish notification event to Kafka for processing by notification service
      await EventFactory.publishEvent(
        SYSTEM_EVENT_TYPES.NOTIFICATION_REQUESTED,
        notificationPayload,
        this.serviceName
      );
    } catch (error) {
      logger.error('Failed to send notification', error as Error);
      throw error;
    }
  }

  /**
   * Send employee-related notifications
   */
  async sendEmployeeNotification(
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated',
    employee: any,
    recipients?: string[]
  ): Promise<void> {
    const notifications: NotificationData[] = [
      {
        recipientId: employee.managerId || 'hr-team',
        type: 'email',
        template: `employee_${action}`,
        subject: `Employee ${action}: ${employee.firstName} ${employee.lastName}`,
        data: {
          employee,
          action,
          timestamp: new Date()
        },
        priority: action === 'created' ? 'high' : 'normal'
      }
    ];

    // Add notifications for additional recipients
    if (recipients) {
      recipients.forEach(recipientId => {
        notifications.push({
          recipientId,
          type: 'in_app',
          template: `employee_${action}_notification`,
          data: {
            employee,
            action,
            timestamp: new Date()
          },
          priority: 'normal'
        });
      });
    }

    // Send all notifications
    await Promise.all(notifications.map(notification => this.sendNotification(notification)));
  }

  /**
   * Send department-related notifications
   */
  async sendDepartmentNotification(
    action: 'created' | 'updated' | 'deleted',
    department: any,
    oldDepartment?: any
  ): Promise<void> {
    await this.sendNotification({
      recipientId: 'hr-team',
      type: 'email',
      template: `department_${action}`,
      subject: `Department ${action}: ${department.name}`,
      data: {
        department,
        oldDepartment,
        action,
        timestamp: new Date()
      },
      priority: 'normal'
    });
  }

  /**
   * Send position-related notifications
   */
  async sendPositionNotification(
    action: 'created' | 'updated' | 'deleted',
    position: any,
    department?: any,
    oldPosition?: any
  ): Promise<void> {
    await this.sendNotification({
      recipientId: department?.managerId || 'hr-team',
      type: 'email',
      template: `position_${action}`,
      subject: `Position ${action}: ${position.title}`,
      data: {
        position,
        department,
        oldPosition,
        action,
        timestamp: new Date()
      },
      priority: 'normal'
    });
  }

  /**
   * Send time attendance notifications
   */
  async sendTimeAttendanceNotification(
    action: 'clock_in' | 'clock_out' | 'late_arrival' | 'early_departure' | 'absence',
    data: any
  ): Promise<void> {
    const priority = action === 'absence' || action === 'late_arrival' ? 'high' : 'normal';
    
    await this.sendNotification({
      recipientId: data.managerId || data.employeeId,
      type: action === 'absence' ? 'email' : 'in_app',
      template: `attendance_${action}`,
      subject: `Time & Attendance: ${action.replace('_', ' ')}`,
      data: {
        ...data,
        action,
        timestamp: new Date()
      },
      priority
    });
  }

  /**
   * Send leave request notifications
   */
  async sendLeaveNotification(
    action: 'requested' | 'approved' | 'rejected' | 'cancelled',
    leaveRequest: any,
    approver?: any
  ): Promise<void> {
    const notifications: NotificationData[] = [];

    // Notify employee
    notifications.push({
      recipientId: leaveRequest.employeeId,
      type: 'email',
      template: `leave_${action}`,
      subject: `Leave Request ${action}`,
      data: {
        leaveRequest,
        approver,
        action,
        timestamp: new Date()
      },
      priority: action === 'approved' || action === 'rejected' ? 'high' : 'normal'
    });

    // Notify manager/HR for new requests
    if (action === 'requested') {
      notifications.push({
        recipientId: leaveRequest.managerId || 'hr-team',
        type: 'email',
        template: 'leave_approval_required',
        subject: 'Leave Request Approval Required',
        data: {
          leaveRequest,
          action,
          timestamp: new Date()
        },
        priority: 'high'
      });
    }

    await Promise.all(notifications.map(notification => this.sendNotification(notification)));
  }

  /**
   * Send performance-related notifications
   */
  async sendPerformanceNotification(
    action: 'review_due' | 'review_completed' | 'goal_assigned' | 'feedback_received',
    data: any
  ): Promise<void> {
    await this.sendNotification({
      recipientId: data.employeeId || data.revieweeId,
      type: 'email',
      template: `performance_${action}`,
      subject: `Performance Management: ${action.replace('_', ' ')}`,
      data: {
        ...data,
        action,
        timestamp: new Date()
      },
      priority: action === 'review_due' ? 'high' : 'normal'
    });
  }

  /**
   * Send system alerts
   */
  async sendSystemAlert(
    level: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    data?: any
  ): Promise<void> {
    await this.sendNotification({
      recipientId: 'system-admins',
      type: 'email',
      template: 'system_alert',
      subject: `System Alert [${level.toUpperCase()}]: ${message}`,
      data: {
        level,
        message,
        data,
        timestamp: new Date(),
        serviceName: this.serviceName
      },
      priority: level === 'critical' || level === 'error' ? 'urgent' : 'high'
    });
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${this.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
