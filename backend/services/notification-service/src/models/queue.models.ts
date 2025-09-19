/**
 * Queue-related interfaces and models for notification service
 */

export interface NotificationJob {
  notificationId: string;
  scheduledAt?: Date;
}
