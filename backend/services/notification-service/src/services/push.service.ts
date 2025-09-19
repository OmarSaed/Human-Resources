import * as admin from 'firebase-admin';
import { createLogger, getServiceConfig } from '@hrms/shared';
import { PushNotificationRequest } from '../models/delivery.models';

const logger = createLogger('push-service');
const config = getServiceConfig('notification-service');


export class PushService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (!config.features.push) {
        logger.info('Push notification service disabled in configuration');
        return;
      }

      if (!config.push.projectId || !config.push.privateKey || !config.push.clientEmail) {
        logger.warn('Push notification service not configured - missing Firebase credentials');
        return;
      }

      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.push.projectId,
            privateKey: config.push.privateKey,
            clientEmail: config.push.clientEmail,
          }),
        });
      }

      this.isInitialized = true;
      logger.info('Push notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize push notification service', error as Error);
      // Don't throw - allow service to continue without push notifications
      this.isInitialized = false;
    }
  }

  async sendPushNotification(request: PushNotificationRequest): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const tokens = Array.isArray(request.token) ? request.token : [request.token];
      
      for (const token of tokens) {
        const message: admin.messaging.Message = {
          token,
          notification: {
            title: request.title,
            body: request.body,
            imageUrl: request.imageUrl,
          },
          data: request.data,
          android: {
            notification: {
              clickAction: request.clickAction,
              icon: 'ic_notification',
              color: '#2196F3',
            },
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
              },
            },
          },
          webpush: {
            notification: {
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              actions: request.clickAction ? [
                {
                  action: 'open',
                  title: 'Open',
                },
              ] : undefined,
            },
          },
        };

        const response = await admin.messaging().send(message);
        
        logger.info('Push notification sent successfully', {
          token: token.substring(0, 20) + '...', // Log partial token for privacy
          title: request.title,
          messageId: response,
        });
      }
    } catch (error) {
      logger.error('Failed to send push notification', {
        title: request.title,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async sendBulkPushNotifications(requests: PushNotificationRequest[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Push notification service not initialized');
    }

    const promises = requests.map(request => this.sendPushNotification(request));
    await Promise.allSettled(promises);
  }

  async sendToTopic(topic: string, notification: Omit<PushNotificationRequest, 'token'>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
      };

      const response = await admin.messaging().send(message);
      
      logger.info('Push notification sent to topic successfully', {
        topic,
        title: notification.title,
        messageId: response,
      });
    } catch (error) {
      logger.error('Failed to send push notification to topic', {
        topic,
        title: notification.title,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      
      logger.info('Tokens subscribed to topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      logger.error('Failed to subscribe tokens to topic', {
        topic,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      
      logger.info('Tokens unsubscribed from topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      logger.error('Failed to unsubscribe tokens from topic', {
        topic,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (admin.apps.length > 0) {
      await Promise.all(admin.apps.map(app => app?.delete()));
      logger.info('Firebase Admin SDK cleaned up');
    }
  }

  isHealthy(): boolean {
    return this.isInitialized;
  }
}
