import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationTemplateService } from '../services/notification-template.service';
import { createLogger } from '@hrms/shared';

const logger = createLogger('notification-template-controller');

export class NotificationTemplateController {
  constructor(private notificationTemplateService: NotificationTemplateService) {}

  /**
   * Create a new notification template
   */
  createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const templateData = req.body;
      const userId = (req as any).user?.id;

      logger.info('Creating notification template', { 
        templateName: templateData.name,
        userId 
      });

      const template = await this.notificationTemplateService.createTemplate({
        ...templateData,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: template,
        message: 'Notification template created successfully',
      });
    } catch (error) {
      logger.error('Error creating notification template', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create notification template',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get all notification templates with pagination and filtering
   */
  listTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        channel,
        isActive,
        search,
      } = req.query;

      logger.info('Listing notification templates', {
        page,
        limit,
        category,
        channel,
        isActive,
        search,
      });

      const filters = {
        category: category as string,
        channel: channel as any,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search: search as string,
      };

      const result = await this.notificationTemplateService.listTemplates(
        Number(page),
        Number(limit),
        filters
      );

      res.json({
        success: true,
        data: result.templates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Error listing notification templates', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to list notification templates',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get a specific notification template by ID
   */
  getTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      logger.info('Getting notification template', { templateId: id });

      const template = await this.notificationTemplateService.getTemplateById(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Notification template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Error getting notification template', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification template',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Update a notification template
   */
  updateTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as any).user?.id;

      logger.info('Updating notification template', { 
        templateId: id,
        userId 
      });

      const template = await this.notificationTemplateService.updateTemplate(id, {
        ...updateData,
        updatedBy: userId,
      });

      res.json({
        success: true,
        data: template,
        message: 'Notification template updated successfully',
      });
    } catch (error) {
      logger.error('Error updating notification template', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update notification template',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Delete a notification template
   */
  deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      logger.info('Deleting notification template', { 
        templateId: id,
        userId 
      });

      await this.notificationTemplateService.deleteTemplate(id);

      res.json({
        success: true,
        message: 'Notification template deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting notification template', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification template',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get templates by category
   */
  getTemplatesByCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.params;

      logger.info('Getting templates by category', { category });

      const templates = await this.notificationTemplateService.getTemplatesByCategory(category);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error('Error getting templates by category', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get templates by category',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Clone a notification template
   */
  cloneTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = (req as any).user?.id;

      logger.info('Cloning notification template', { 
        templateId: id,
        newName: name,
        userId 
      });

      const clonedTemplate = await this.notificationTemplateService.cloneTemplate(id, name, userId);

      res.status(201).json({
        success: true,
        data: clonedTemplate,
        message: 'Notification template cloned successfully',
      });
    } catch (error) {
      logger.error('Error cloning notification template', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to clone notification template',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Render a template with variables
   */
  renderTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { variables } = req.body;

      logger.info('Rendering notification template', { 
        templateId: id,
        variableCount: Object.keys(variables || {}).length 
      });

      const rendered = await this.notificationTemplateService.renderTemplate(id, variables);

      res.json({
        success: true,
        data: rendered,
      });
    } catch (error) {
      logger.error('Error rendering notification template', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to render notification template',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Validate template syntax
   */
  validateTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subject, htmlContent, textContent } = req.body;

      logger.info('Validating notification template syntax');

      const validation = await this.notificationTemplateService.validateTemplateSyntax({
        subject,
        htmlContent,
        textContent,
      });

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Error validating template syntax', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate template syntax',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Get template usage statistics
   */
  getTemplateUsage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      logger.info('Getting template usage statistics', { 
        templateId: id,
        startDate,
        endDate 
      });

      const usage = await this.notificationTemplateService.getTemplateUsage(
        id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      logger.error('Error getting template usage', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get template usage',
        details: (error as Error).message,
      });
    }
  };

  /**
   * Bulk update templates
   */
  bulkUpdateTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateIds, updateData } = req.body;
      const userId = (req as any).user?.id;

      logger.info('Bulk updating templates', { 
        templateCount: templateIds.length,
        userId 
      });

      const result = await this.notificationTemplateService.bulkUpdateTemplates(
        templateIds,
        updateData
      );

      res.json({
        success: true,
        data: result,
        message: `Updated ${result.count} templates successfully`,
      });
    } catch (error) {
      logger.error('Error bulk updating templates', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk update templates',
        details: (error as Error).message,
      });
    }
  };
}
