import express from 'express';
import { NotificationTemplateController } from '../controllers/notification-template.controller';
import { authMiddleware, requirePermission } from '../middleware';
import { validate } from '@hrms/shared';
import Joi from 'joi';

// Validation schemas
const createTemplateSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  category: Joi.string().required(),
  channel: Joi.string().valid('EMAIL', 'SMS', 'PUSH', 'IN_APP').required(),
  subject: Joi.string().required(),
  htmlContent: Joi.string().optional(),
  textContent: Joi.string().optional(),
  variables: Joi.object().optional(),
  isActive: Joi.boolean().default(true),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  category: Joi.string().optional(),
  channel: Joi.string().valid('EMAIL', 'SMS', 'PUSH', 'IN_APP').optional(),
  subject: Joi.string().optional(),
  htmlContent: Joi.string().optional(),
  textContent: Joi.string().optional(),
  variables: Joi.object().optional(),
  isActive: Joi.boolean().optional(),
});

const cloneTemplateSchema = Joi.object({
  name: Joi.string().required(),
});

const renderTemplateSchema = Joi.object({
  variables: Joi.object().required(),
});

const validateTemplateSchema = Joi.object({
  subject: Joi.string().required(),
  htmlContent: Joi.string().optional(),
  textContent: Joi.string().optional(),
});

const bulkUpdateSchema = Joi.object({
  templateIds: Joi.array().items(Joi.string()).required(),
  updateData: Joi.object().required(),
});

export function createNotificationTemplateRoutes(
  notificationTemplateController: NotificationTemplateController
): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Template CRUD operations
  router.post(
    '/',
    requirePermission('notification_template.create'),
    validate(createTemplateSchema as any, 'body') as any,
    notificationTemplateController.createTemplate
  );

  router.get(
    '/',
    notificationTemplateController.listTemplates
  );

  router.get(
    '/:id',
    notificationTemplateController.getTemplate
  );

  router.put(
    '/:id',
    requirePermission('notification_template.update'),
    validate(updateTemplateSchema as any, 'body') as any,
    notificationTemplateController.updateTemplate
  );

  router.delete(
    '/:id',
    requirePermission('notification_template.delete'),
    notificationTemplateController.deleteTemplate
  );

  // Template operations
  router.get(
    '/category/:category',
    notificationTemplateController.getTemplatesByCategory
  );

  router.post(
    '/:id/clone',
    requirePermission('notification_template.clone'),
    validate(cloneTemplateSchema as any, 'body') as any,
    notificationTemplateController.cloneTemplate
  );

  router.post(
    '/:id/render',
    validate(renderTemplateSchema as any, 'body') as any,
    notificationTemplateController.renderTemplate
  );

  router.post(
    '/validate',
    validate(validateTemplateSchema as any, 'body') as any,
    notificationTemplateController.validateTemplate
  );

  // Analytics and usage
  router.get(
    '/:id/usage',
    requirePermission('notification_template.analytics'),
    notificationTemplateController.getTemplateUsage
  );

  // Bulk operations
  router.post(
    '/bulk-update',
    requirePermission('notification_template.bulk_update'),
    validate(bulkUpdateSchema as any, 'body') as any,
    notificationTemplateController.bulkUpdateTemplates
  );

  return router;
}
