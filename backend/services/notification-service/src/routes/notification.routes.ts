import express from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware, requirePermission, rateLimit } from '../middleware';

export function createNotificationRoutes(notificationController: NotificationController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Apply rate limiting to sending notifications
  router.use('/send', rateLimit(100, 60000)); // 100 notifications per minute
  router.use('/bulk-send', rateLimit(10, 60000)); // 10 bulk operations per minute

  // Notification sending
  router.post(
    '/send',
    requirePermission('notification.send'),
    notificationController.sendNotification
  );

  router.post(
    '/bulk-send',
    requirePermission('notification.bulk_send'),
    notificationController.sendBulkNotifications
  );

  // User notifications
  router.get(
    '/me',
    notificationController.listUserNotifications
  );

  router.get(
    '/me/statistics',
    notificationController.getNotificationStatistics
  );

  router.put(
    '/me/mark-all-read',
    notificationController.markAllAsRead
  );

  // Individual notification operations
  router.get(
    '/:id',
    notificationController.getNotification
  );

  router.put(
    '/:id/read',
    notificationController.markAsRead
  );

  router.delete(
    '/:id',
    notificationController.deleteNotification
  );

  router.post(
    '/:id/retry',
    requirePermission('notification.retry'),
    notificationController.retryNotification
  );

  // Analytics and reporting
  router.get(
    '/analytics/delivery',
    requirePermission('notification.analytics'),
    notificationController.getDeliveryAnalytics
  );

  // Topic subscriptions
  router.post(
    '/topics/subscribe',
    notificationController.subscribeToTopic
  );

  router.delete(
    '/topics/:topic/unsubscribe',
    notificationController.unsubscribeFromTopic
  );

  return router;
}