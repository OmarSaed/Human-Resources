import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { NotificationService } from '../services/notification.service';

const logger = createLogger('notification-controller');

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Send notification
   */
  sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const notificationData = req.body;

      const notification = await this.notificationService.sendNotification({
        ...notificationData,
        source: req.headers['x-service-name'] as string || 'api',
      });

      logger.info('Notification sent successfully', {
        notificationId: notification.id,
        type: notification.type,
        channel: notification.channel,
        sentBy: userId,
      });

      res.status(201).json({
        success: true,
        notification,
        message: 'Notification sent successfully',
      });
    } catch (error) {
      logger.error('Failed to send notification', error as Error);
      res.status(500).json({
        error: 'Failed to send notification',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get notification by ID
   */
  getNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const notification = await this.notificationService.getNotification(id, userId);

      if (!notification) {
        res.status(404).json({
          error: 'Notification not found',
          message: 'The requested notification was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        notification,
      });
    } catch (error) {
      logger.error('Failed to get notification', { error: error as Error, notificationId: req.params.id });
      res.status(500).json({
        error: 'Failed to retrieve notification',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List user notifications
   */
  listUserNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        type,
        channel,
        status,
        unreadOnly = false,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        type: type as string,
        channel: channel as string,
        status: status as string,
        unreadOnly: unreadOnly === 'true',
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.notificationService.listUserNotifications(userId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list user notifications', error as Error);
      res.status(500).json({
        error: 'Failed to list user notifications',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Mark notification as read
   */
  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const notification = await this.notificationService.markAsRead(id, userId);

      logger.info('Notification marked as read', { notificationId: id, userId });

      res.json({
        success: true,
        notification,
        message: 'Notification marked as read',
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', { error: error as Error, notificationId: req.params.id });
      res.status(500).json({
        error: 'Failed to mark notification as read',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Mark all notifications as read
   */
  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;

      const result = await this.notificationService.markAllAsRead(userId);

      logger.info('All notifications marked as read', { userId, count: result.count });

      res.json({
        success: true,
        count: result.count,
        message: `${result.count} notifications marked as read`,
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error as Error);
      res.status(500).json({
        error: 'Failed to mark all notifications as read',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete notification
   */
  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.notificationService.deleteNotification(id, userId);

      logger.info('Notification deleted', { notificationId: id, userId });

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete notification', { error: error as Error, notificationId: req.params.id });
      res.status(500).json({
        error: 'Failed to delete notification',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get notification statistics
   */
  getNotificationStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;

      const stats = await this.notificationService.getNotificationStatistics(userId);

      res.json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      logger.error('Failed to get notification statistics', error as Error);
      res.status(500).json({
        error: 'Failed to get notification statistics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Send bulk notifications
   */
  sendBulkNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { notifications } = req.body;

      const result = await this.notificationService.sendBulkNotifications(notifications, {
        source: req.headers['x-service-name'] as string || 'api',
        sentBy: userId,
      });

      logger.info('Bulk notifications sent', {
        totalRequested: notifications.length,
        successful: result.successful,
        failed: result.failed,
        sentBy: userId,
      });

      res.json({
        success: true,
        result,
        message: `${result.successful} notifications sent successfully, ${result.failed} failed`,
      });
    } catch (error) {
      logger.error('Failed to send bulk notifications', error as Error);
      res.status(500).json({
        error: 'Failed to send bulk notifications',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Retry failed notification
   */
  retryNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const notification = await this.notificationService.retryNotification(id, userId);

      logger.info('Notification retry initiated', { notificationId: id, userId });

      res.json({
        success: true,
        notification,
        message: 'Notification retry initiated',
      });
    } catch (error) {
      logger.error('Failed to retry notification', { error: error as Error, notificationId: req.params.id });
      res.status(500).json({
        error: 'Failed to retry notification',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get notification delivery analytics
   */
  getDeliveryAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { startDate, endDate, type, channel } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as string,
        channel: channel as string,
        requestingUserId: userId,
      };

      const analytics = await this.notificationService.getDeliveryAnalytics(options);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get delivery analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get delivery analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Subscribe to notification topic
   */
  subscribeToTopic = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { topic, deviceToken } = req.body;

      await this.notificationService.subscribeToTopic(userId, topic, deviceToken);

      logger.info('User subscribed to topic', { userId, topic });

      res.json({
        success: true,
        message: `Subscribed to topic: ${topic}`,
      });
    } catch (error) {
      logger.error('Failed to subscribe to topic', error as Error);
      res.status(500).json({
        error: 'Failed to subscribe to topic',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Unsubscribe from notification topic
   */
  unsubscribeFromTopic = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { topic } = req.params;

      await this.notificationService.unsubscribeFromTopic(userId, topic);

      logger.info('User unsubscribed from topic', { userId, topic });

      res.json({
        success: true,
        message: `Unsubscribed from topic: ${topic}`,
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', error as Error);
      res.status(500).json({
        error: 'Failed to unsubscribe from topic',
        message: (error as Error).message,
      });
    }
  };
}
