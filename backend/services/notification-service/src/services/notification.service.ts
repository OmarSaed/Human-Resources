import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import {
  NotificationData,
  ListUserNotificationsOptions,
  NotificationStatistics,
  DeliveryAnalytics
} from '../models/notification.models';

const logger = createLogger('notification-service');

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Send notification
   */
  async sendNotification(data: NotificationData): Promise<any> {
    try {
      // Check user preferences if userId is provided
      let shouldSend = true;
      if (data.userId) {
        shouldSend = await this.checkUserPreferences(data.userId, data.type, data.channel);
      }

      if (!shouldSend) {
        logger.info('Notification skipped due to user preferences', {
          userId: data.userId,
          type: data.type,
          channel: data.channel,
        });
        return null;
      }

      // Apply template if provided
      let finalMessage = data.message;
      let finalSubject = data.subject;

      if (data.templateId) {
        const template = await this.applyTemplate(data.templateId, data.data || {});
        finalMessage = template.body;
        finalSubject = template.subject || undefined;
      }

      const notification = await this.prisma.notification.create({
        data: {
          templateId: data.templateId,
          type: data.type,
          channel: data.channel,
          priority: data.priority || 'NORMAL',
          userId: data.userId,
          email: data.email,
          phoneNumber: data.phoneNumber,
          deviceToken: data.deviceToken,
          subject: finalSubject,
          message: finalMessage,
          data: data.data,
          correlationId: data.correlationId,
          source: data.source,
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 3,
        },
        include: {
          template: true,
        },
      });

      // Queue for delivery
      await this.queueForDelivery(notification);

      logger.info('Notification created and queued', {
        notificationId: notification.id,
        type: notification.type,
        channel: notification.channel,
        userId: notification.userId,
      });

      return notification;
    } catch (error) {
      logger.error('Failed to send notification', error as Error);
      throw error;
    }
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string, requestingUserId: string): Promise<any | null> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
        include: {
          template: true,
        },
      });

      if (!notification) {
        return null;
      }

      // Check access permissions
      if (notification.userId !== requestingUserId) {
        const hasPermission = await this.checkAdminAccess(requestingUserId);
        if (!hasPermission) {
          return null;
        }
      }

      return notification;
    } catch (error) {
      logger.error('Failed to get notification', { error: error as Error, notificationId });
      throw error;
    }
  }

  /**
   * List user notifications
   */
  async listUserNotifications(
    userId: string,
    options: ListUserNotificationsOptions
  ): Promise<{
    notifications: any[];
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
  }> {
    try {
      const {
        type,
        channel,
        status,
        unreadOnly,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = { userId };

      if (type) where.type = type;
      if (channel) where.channel = channel;
      if (status) where.status = status;
      if (unreadOnly) where.readAt = null;

      const [notifications, total, unreadCount] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            template: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({
          where: { userId, readAt: null },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        notifications,
        total,
        page,
        totalPages,
        unreadCount,
      };
    } catch (error) {
      logger.error('Failed to list user notifications', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new Error('You can only mark your own notifications as read');
      }

      const updatedNotification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          readAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Log the read action
      await this.logNotificationAction(notificationId, 'read', { userId });

      return updatedNotification;
    } catch (error) {
      logger.error('Failed to mark notification as read', { error: error as Error, notificationId });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('All notifications marked as read', { userId, count: result.count });

      return { count: result.count };
    } catch (error) {
      logger.error('Failed to mark all notifications as read', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== userId) {
        const hasPermission = await this.checkAdminAccess(userId);
        if (!hasPermission) {
          throw new Error('You can only delete your own notifications');
        }
      }

      await this.prisma.notification.delete({
        where: { id: notificationId },
      });

      logger.info('Notification deleted', { notificationId, userId });
    } catch (error) {
      logger.error('Failed to delete notification', { error: error as Error, notificationId });
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(userId: string): Promise<NotificationStatistics> {
    try {
      const [
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        notificationsByChannel,
        notificationsByStatus,
        recentActivity,
      ] = await Promise.all([
        this.prisma.notification.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, readAt: null } }),
        this.prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true },
        }),
        this.prisma.notification.groupBy({
          by: ['channel'],
          where: { userId },
          _count: { channel: true },
        }),
        this.prisma.notification.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true },
        }),
        this.prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            channel: true,
            status: true,
            createdAt: true,
            readAt: true,
          },
        }),
      ]);

      const typeCounts: Record<string, number> = {};
      notificationsByType.forEach(item => {
        typeCounts[item.type] = item._count.type;
      });

      const channelCounts: Record<string, number> = {};
      notificationsByChannel.forEach(item => {
        channelCounts[item.channel] = item._count.channel;
      });

      const statusCounts: Record<string, number> = {};
      notificationsByStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
      });

      return {
        totalNotifications,
        unreadNotifications,
        notificationsByType: typeCounts,
        notificationsByChannel: channelCounts,
        notificationsByStatus: statusCounts,
        recentActivity,
      };
    } catch (error) {
      logger.error('Failed to get notification statistics', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: NotificationData[],
    context: { source: string; sentBy: string }
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    try {
      let successful = 0;
      let failed = 0;
      const results = [];

      for (const notificationData of notifications) {
        try {
          const notification = await this.sendNotification({
            ...notificationData,
            source: context.source,
          });
          
          results.push({
            success: true,
            notificationId: notification?.id,
            data: notificationData,
          });
          successful++;
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            data: notificationData,
          });
          failed++;
        }
      }

      logger.info('Bulk notifications processed', {
        total: notifications.length,
        successful,
        failed,
        sentBy: context.sentBy,
      });

      return { successful, failed, results };
    } catch (error) {
      logger.error('Failed to send bulk notifications', error as Error);
      throw error;
    }
  }

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string, requestingUserId: string): Promise<any> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.status !== 'FAILED') {
        throw new Error('Can only retry failed notifications');
      }

      if (notification.retryCount >= notification.maxRetries) {
        throw new Error('Maximum retry attempts exceeded');
      }

      const updatedNotification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'PENDING',
          retryCount: notification.retryCount + 1,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

      // Queue for delivery
      await this.queueForDelivery(updatedNotification);

      logger.info('Notification retry initiated', {
        notificationId,
        retryCount: updatedNotification.retryCount,
        requestingUserId,
      });

      return updatedNotification;
    } catch (error) {
      logger.error('Failed to retry notification', { error: error as Error, notificationId });
      throw error;
    }
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    channel?: string;
    requestingUserId: string;
  }): Promise<DeliveryAnalytics> {
    try {
      const { startDate, endDate, type, channel } = options;

      const where: any = {};
      if (type) where.type = type;
      if (channel) where.channel = channel;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalSent,
        totalDelivered,
        totalFailed,
        byChannel,
        byType,
        allNotifications,
      ] = await Promise.all([
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({ where: { ...where, status: 'DELIVERED' } }),
        this.prisma.notification.count({ where: { ...where, status: 'FAILED' } }),
        this.prisma.notification.groupBy({
          by: ['channel', 'status'],
          where,
          _count: { id: true },
        }),
        this.prisma.notification.groupBy({
          by: ['type', 'status'],
          where,
          _count: { id: true },
        }),
        this.prisma.notification.findMany({
          where,
          select: {
            createdAt: true,
            status: true,
            channel: true,
            type: true,
          },
        }),
      ]);

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const failureRate = totalSent > 0 ? (totalFailed / totalSent) * 100 : 0;

      // Process channel analytics
      const channelAnalytics: Record<string, any> = {};
      byChannel.forEach(item => {
        if (!channelAnalytics[item.channel]) {
          channelAnalytics[item.channel] = { sent: 0, delivered: 0, failed: 0 };
        }
        if (item.status === 'SENT' || item.status === 'DELIVERED' || item.status === 'FAILED') {
          channelAnalytics[item.channel].sent += item._count.id;
        }
        if (item.status === 'DELIVERED') {
          channelAnalytics[item.channel].delivered = item._count.id;
        }
        if (item.status === 'FAILED') {
          channelAnalytics[item.channel].failed = item._count.id;
        }
      });

      // Calculate delivery rates for channels
      Object.keys(channelAnalytics).forEach(channel => {
        const data = channelAnalytics[channel];
        data.deliveryRate = data.sent > 0 ? (data.delivered / data.sent) * 100 : 0;
      });

      // Process type analytics
      const typeAnalytics: Record<string, any> = {};
      byType.forEach(item => {
        if (!typeAnalytics[item.type]) {
          typeAnalytics[item.type] = { sent: 0, delivered: 0, failed: 0 };
        }
        if (item.status === 'SENT' || item.status === 'DELIVERED' || item.status === 'FAILED') {
          typeAnalytics[item.type].sent += item._count.id;
        }
        if (item.status === 'DELIVERED') {
          typeAnalytics[item.type].delivered = item._count.id;
        }
        if (item.status === 'FAILED') {
          typeAnalytics[item.type].failed = item._count.id;
        }
      });

      // Calculate daily metrics
      const dailyMetrics = this.calculateDailyMetrics(allNotifications);

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
        failureRate,
        byChannel: channelAnalytics,
        byType: typeAnalytics,
        trends: dailyMetrics, // Using dailyMetrics for trends
        dailyMetrics,
      };
    } catch (error) {
      logger.error('Failed to get delivery analytics', error as Error);
      throw error;
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(userId: string, topic: string, deviceToken?: string): Promise<void> {
    try {
      // This would integrate with push notification service (FCM, APNS, etc.)
      // For now, we'll just log the subscription
      logger.info('User subscribed to topic', { userId, topic, deviceToken });

      // You could store topic subscriptions in a separate table
      // await this.prisma.topicSubscription.create({
      //   data: { userId, topic, deviceToken }
      // });
    } catch (error) {
      logger.error('Failed to subscribe to topic', { error: error as Error, userId, topic });
      throw error;
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeFromTopic(userId: string, topic: string): Promise<void> {
    try {
      // This would integrate with push notification service
      logger.info('User unsubscribed from topic', { userId, topic });

      // await this.prisma.topicSubscription.deleteMany({
      //   where: { userId, topic }
      // });
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', { error: error as Error, userId, topic });
      throw error;
    }
  }

  // Private helper methods

  private async checkUserPreferences(
    userId: string, 
    type: string, 
    channel: string
  ): Promise<boolean> {
    try {
      const preferences = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        return true; // Default to allowing notifications
      }

      // Check channel preferences
      if (channel === 'EMAIL' && !preferences.emailEnabled) return false;
      if (channel === 'SMS' && !preferences.smsEnabled) return false;
      if (channel === 'PUSH' && !preferences.pushEnabled) return false;

      // Check type preferences
      if (type.startsWith('EMPLOYEE_') && !preferences.employeeUpdates) return false;
      if (type.startsWith('SYSTEM_') && !preferences.systemAlerts) return false;
      if (type.startsWith('RECRUITMENT_') && !preferences.recruitmentUpdates) return false;
      if (type.startsWith('PERFORMANCE_') && !preferences.performanceUpdates) return false;
      if (type.startsWith('LEARNING_') && !preferences.learningUpdates) return false;
      if (type.startsWith('ATTENDANCE_') && !preferences.attendanceAlerts) return false;

      return true;
    } catch (error) {
      logger.error('Failed to check user preferences', { error: error as Error, userId });
      return true; // Default to allowing notifications on error
    }
  }

  private async applyTemplate(templateId: string, data: any): Promise<{ subject?: string | null; body: string }> {
    try {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Simple template variable replacement
      let body = template.body;
      let subject = template.subject;

      const variables = template.variables as any;
      if (variables && typeof variables === 'object') {
        Object.keys(variables).forEach(key => {
          if (data[key] !== undefined) {
            const placeholder = `{{${key}}}`;
            body = body.replace(new RegExp(placeholder, 'g'), data[key]);
            if (subject) {
              subject = subject.replace(new RegExp(placeholder, 'g'), data[key]);
            }
          }
        });
      }

      return { subject: subject || undefined, body };
    } catch (error) {
      logger.error('Failed to apply template', { error: error as Error, templateId });
      throw error;
    }
  }

  private async queueForDelivery(notification: any): Promise<void> {
    try {
      // This would queue the notification for actual delivery
      // For now, we'll simulate immediate delivery
      await this.simulateDelivery(notification);
    } catch (error) {
      logger.error('Failed to queue notification for delivery', {
        error: error as Error,
        notificationId: notification.id,
      });
      throw error;
    }
  }

  private async simulateDelivery(notification: any): Promise<void> {
    try {
      // Simulate delivery delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate delivery success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'DELIVERED',
            sentAt: new Date(),
            deliveredAt: new Date(),
          },
        });

        await this.logNotificationAction(notification.id, 'delivered', {
          channel: notification.channel,
        });
      } else {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: 'Simulated delivery failure',
          },
        });

        await this.logNotificationAction(notification.id, 'failed', {
          error: 'Simulated delivery failure',
        });
      }
    } catch (error) {
      logger.error('Failed to simulate delivery', {
        error: error as Error,
        notificationId: notification.id,
      });
    }
  }

  private async logNotificationAction(
    notificationId: string, 
    action: string, 
    details?: any
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          notificationId,
          action,
          details,
        },
      });
    } catch (error) {
      logger.error('Failed to log notification action', {
        error: error as Error,
        notificationId,
        action,
      });
    }
  }

  private async checkAdminAccess(userId: string): Promise<boolean> {
    // This would check if user has admin or appropriate role
    // For now, return false to restrict access
    return false;
  }

  private calculateDailyMetrics(notifications: any[]): Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }> {
    const dailyData: Record<string, { sent: number; delivered: number; failed: number }> = {};

    notifications.forEach(notification => {
      const date = notification.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { sent: 0, delivered: 0, failed: 0 };
      }

      dailyData[date].sent++;
      if (notification.status === 'DELIVERED') {
        dailyData[date].delivered++;
      } else if (notification.status === 'FAILED') {
        dailyData[date].failed++;
      }
    });

    return Object.entries(dailyData)
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}