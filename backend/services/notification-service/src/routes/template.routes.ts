import express from 'express';
import Joi from 'joi';
import { createLogger } from '@hrms/shared';
import { NotificationTemplateService } from '../services/notification-template.service';

const logger = createLogger('template-routes');
const router = express.Router();

// Validation schemas
const createTemplateSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().required(),
  channel: Joi.string().valid('EMAIL', 'SMS', 'PUSH', 'IN_APP').required(),
  subject: Joi.string().optional(),
  body: Joi.string().required(),
  variables: Joi.object().default({}),
  isActive: Joi.boolean().default(true),
});

export function createTemplateRoutes(templateService: NotificationTemplateService): express.Router {

  /**
   * Get all notification templates
   */
  router.get('/', async (req, res) => {
    try {
      const result = await templateService.listTemplates(1, 100, {});
      const templates = result.templates;

      res.json({
        success: true,
        templates,
        total: templates.length,
      });
    } catch (error) {
      logger.error('Failed to get templates', error as Error);
      res.status(500).json({
        error: 'Failed to get templates',
        message: (error as Error).message,
      });
    }
  });

  /**
   * Create a new notification template
   */
  router.post('/', async (req, res) => {
    try {
      const { error, value } = createTemplateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details,
        });
      }

      const template = await templateService.createTemplate(value);

      res.status(201).json({
        success: true,
        template,
        message: 'Template created successfully',
      });
    } catch (error) {
      logger.error('Failed to create template', error as Error);
      res.status(500).json({
        error: 'Failed to create template',
        message: (error as Error).message,
      });
    }
  });

  return router;
}
