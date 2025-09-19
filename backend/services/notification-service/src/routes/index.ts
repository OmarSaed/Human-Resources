import express from 'express';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../docs/swagger.config';
import { NotificationService } from '../services/notification.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationPreferenceController } from '../controllers/notification-preference.controller';
import { NotificationTemplateController } from '../controllers/notification-template.controller';
import { createNotificationRoutes } from './notification.routes';
import { createNotificationPreferenceRoutes } from './notification-preference.routes';
import { createNotificationTemplateRoutes } from './notification-template.routes';

export function createRoutes(
  prisma: PrismaClient,
  notificationService: NotificationService,
  preferenceService: NotificationPreferenceService,
  templateService: NotificationTemplateService
): express.Router {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'notification-service',
      version: '2.0.0',
      features: {
        multiChannelNotifications: true,
        notificationTemplates: true,
        userPreferences: true,
        bulkNotifications: true,
        deliveryTracking: true,
        analytics: true,
      },
    });
  });

  // Service info endpoint
  router.get('/info', (req, res) => {
    res.json({
      service: 'Notification Service',
      version: '2.0.0',
      description: 'Multi-channel notification system with templates, preferences, and delivery tracking',
      endpoints: {
        notifications: '/api/v1/notifications',
        preferences: '/api/v1/preferences',
        templates: '/api/v1/templates',
      },
      capabilities: [
        'Email Notifications',
        'SMS Notifications',
        'Push Notifications',
        'In-App Notifications',
        'Notification Templates',
        'User Preferences',
        'Quiet Hours',
        'Bulk Notifications',
        'Delivery Analytics',
        'Retry Mechanisms',
        'Topic Subscriptions',
      ],
      channels: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
      notificationTypes: [
        'EMPLOYEE_WELCOME',
        'EMPLOYEE_UPDATED',
        'EMPLOYEE_TERMINATED',
        'RECRUITMENT_APPLICATION_RECEIVED',
        'RECRUITMENT_INTERVIEW_SCHEDULED',
        'RECRUITMENT_STATUS_UPDATED',
        'PERFORMANCE_REVIEW_DUE',
        'PERFORMANCE_REVIEW_COMPLETED',
        'PERFORMANCE_GOAL_ASSIGNED',
        'LEARNING_COURSE_ASSIGNED',
        'LEARNING_COURSE_COMPLETED',
        'LEARNING_CERTIFICATION_EARNED',
        'ATTENDANCE_LATE_CHECKIN',
        'ATTENDANCE_MISSING_CHECKOUT',
        'ATTENDANCE_LEAVE_APPROVED',
        'ATTENDANCE_LEAVE_REJECTED',
        'SYSTEM_ALERT',
        'SYSTEM_MAINTENANCE',
        'CUSTOM',
      ],
    });
  });

  // API Documentation
  router.use('/api/docs', swaggerUi.serve);
  router.get('/api/docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HRMS Notification Service API Documentation',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
    },
  }));

  // API Documentation JSON
  router.get('/api/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Initialize controllers
  const notificationController = new NotificationController(notificationService);
  const preferenceController = new NotificationPreferenceController(preferenceService);
  const templateController = new NotificationTemplateController(templateService);

  // API routes
  router.use('/api/v1/notifications', createNotificationRoutes(notificationController));
  router.use('/api/v1/preferences', createNotificationPreferenceRoutes(preferenceController));
  router.use('/api/v1/templates', createNotificationTemplateRoutes(templateController));

  return router;
}