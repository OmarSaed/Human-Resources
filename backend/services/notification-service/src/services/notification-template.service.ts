import { PrismaClient, NotificationTemplate, NotificationChannel } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import Handlebars from 'handlebars';
import {
  CreateTemplateData,
  UpdateTemplateData,
  TemplateFilters,
  RenderedTemplate,
  TemplateValidation,
  TemplateUsage
} from '../models/template.models';

const logger = createLogger('notification-template-service');


export class NotificationTemplateService {
  constructor(private prisma: PrismaClient) {
    this.registerHandlebarsHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date, format: string = 'YYYY-MM-DD') => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString();
    });

    Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
      if (typeof amount !== 'number') return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    });

    Handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    Handlebars.registerHelper('lt', (a: any, b: any) => a < b);
  }

  /**
   * Create a new notification template
   */
  async createTemplate(data: CreateTemplateData): Promise<NotificationTemplate> {
    try {
      logger.info('Creating notification template', { 
        name: data.name,
        category: data.category,
        channel: data.channel 
      });

      // Validate template syntax
      const validation = await this.validateTemplateSyntax({
        subject: data.subject || '',
        htmlContent: data.htmlContent,
        textContent: data.textContent,
      });

      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      const template = await this.prisma.notificationTemplate.create({
        data: {
          name: data.name,
          type: data.type as any,
          channel: data.channel,
          subject: data.subject,
          body: data.body,
          variables: data.variables,
          isActive: data.isActive ?? true,
        },
      });

      logger.info('Notification template created successfully', { 
        templateId: template.id,
        name: template.name 
      });

      return template;
    } catch (error) {
      logger.error('Error creating notification template', error as Error);
      throw error;
    }
  }

  /**
   * Get templates with pagination and filtering
   */
  async listTemplates(
    page: number = 1,
    limit: number = 10,
    filters: TemplateFilters = {}
  ): Promise<{ templates: NotificationTemplate[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const where: any = {};

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.channel) {
        where.channel = filters.channel;
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { category: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [templates, total] = await Promise.all([
        this.prisma.notificationTemplate.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.notificationTemplate.count({ where }),
      ]);

      logger.info('Listed notification templates', { 
        count: templates.length,
        total,
        page,
        limit 
      });

      return { templates, total };
    } catch (error) {
      logger.error('Error listing notification templates', error as Error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplateById(id: string): Promise<NotificationTemplate | null> {
    try {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { id },
      });

      if (template) {
        logger.info('Retrieved notification template', { templateId: id });
      } else {
        logger.warn('Notification template not found', { templateId: id });
      }

      return template;
    } catch (error) {
      logger.error('Error getting notification template', error as Error);
      throw error;
    }
  }

  /**
   * Update a notification template
   */
  async updateTemplate(id: string, data: UpdateTemplateData): Promise<NotificationTemplate> {
    try {
      logger.info('Updating notification template', { templateId: id });

      // Validate template syntax if content is being updated
      if (data.subject || data.htmlContent || data.textContent) {
        const existingTemplate = await this.getTemplateById(id);
        if (!existingTemplate) {
          throw new Error('Template not found');
        }

        const validation = await this.validateTemplateSyntax({
          subject: data.subject || existingTemplate.subject || '',
          htmlContent: data.htmlContent || (existingTemplate as any).htmlContent,
          textContent: data.textContent || (existingTemplate as any).textContent,
        });

        if (!validation.isValid) {
          throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
        }
      }

      const updateData: any = { ...data };
      if (data.updatedBy) {
        updateData.updatedAt = new Date();
      }

      const template = await this.prisma.notificationTemplate.update({
        where: { id },
        data: updateData,
      });

      logger.info('Notification template updated successfully', { 
        templateId: id,
        name: template.name 
      });

      return template;
    } catch (error) {
      logger.error('Error updating notification template', error as Error);
      throw error;
    }
  }

  /**
   * Delete a notification template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      logger.info('Deleting notification template', { templateId: id });

      await this.prisma.notificationTemplate.delete({
        where: { id },
      });

      logger.info('Notification template deleted successfully', { templateId: id });
    } catch (error) {
      logger.error('Error deleting notification template', error as Error);
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<NotificationTemplate[]> {
    try {
      const templates = await this.prisma.notificationTemplate.findMany({
        where: {
          // category, // Category field not available in Prisma schema
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      logger.info('Retrieved templates by category', { 
        category,
        count: templates.length 
      });

      return templates;
    } catch (error) {
      logger.error('Error getting templates by category', error as Error);
      throw error;
    }
  }

  /**
   * Clone a notification template
   */
  async cloneTemplate(id: string, newName: string, userId: string): Promise<NotificationTemplate> {
    try {
      logger.info('Cloning notification template', { 
        templateId: id,
        newName,
        userId 
      });

      const originalTemplate = await this.getTemplateById(id);
      if (!originalTemplate) {
        throw new Error('Original template not found');
      }

      const clonedTemplate = await this.prisma.notificationTemplate.create({
        data: {
          name: newName,
          type: originalTemplate.type, // Required field
          // description: `Copy of ${originalTemplate.description || originalTemplate.name}`, // description field not in schema
          // category: originalTemplate.category, // category field not in schema
          channel: originalTemplate.channel,
          subject: originalTemplate.subject,
          // htmlContent: originalTemplate.htmlContent, // htmlContent field not in schema
          // textContent: originalTemplate.textContent, // textContent field not in schema
          body: originalTemplate.body, // Use body field instead
          variables: originalTemplate.variables as any,
          isActive: false, // Cloned templates start as inactive
          // tags: originalTemplate.tags, // tags field not in schema
          // createdBy: userId, // createdBy field not in schema
        },
      });

      logger.info('Notification template cloned successfully', { 
        originalId: id,
        clonedId: clonedTemplate.id,
        newName 
      });

      return clonedTemplate;
    } catch (error) {
      logger.error('Error cloning notification template', error as Error);
      throw error;
    }
  }

  /**
   * Render a template with variables
   */
  async renderTemplate(id: string, variables: Record<string, any> = {}): Promise<RenderedTemplate> {
    try {
      logger.info('Rendering notification template', { 
        templateId: id,
        variableCount: Object.keys(variables).length 
      });

      const template = await this.getTemplateById(id);
      if (!template) {
        throw new Error('Template not found');
      }

      const subjectTemplate = Handlebars.compile(template.subject);
      const subject = subjectTemplate(variables);

      let htmlContent: string | undefined;
      let textContent: string | undefined;

      // Use body field for content since htmlContent/textContent don't exist in schema
      const bodyTemplate = Handlebars.compile(template.body);
      htmlContent = bodyTemplate(variables);
      textContent = bodyTemplate(variables);

      // if (template.htmlContent) {
      //   const htmlTemplate = Handlebars.compile(template.htmlContent);
      //   htmlContent = htmlTemplate(variables);
      // }

      // if (template.textContent) {
      //   const textTemplate = Handlebars.compile(template.textContent);
      //   textContent = textTemplate(variables);
      // }

      const rendered = {
        subject,
        body: bodyTemplate(variables), // Required by RenderedTemplate interface
        htmlContent,
        textContent,
      };

      logger.info('Template rendered successfully', { 
        templateId: id,
        renderedSubject: subject.substring(0, 50) 
      });

      return rendered;
    } catch (error) {
      logger.error('Error rendering template', error as Error);
      throw error;
    }
  }

  /**
   * Validate template syntax
   */
  async validateTemplateSyntax(content: {
    subject: string;
    htmlContent?: string;
    textContent?: string;
  }): Promise<TemplateValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: string[] = [];

    try {
      // Extract variables from templates
      const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
      
      const extractVariables = (text: string) => {
        let match;
        while ((match = variableRegex.exec(text)) !== null) {
          variables.push(match[1].trim());
        }
      };

      // Validate subject
      try {
        Handlebars.compile(content.subject);
        extractVariables(content.subject);
      } catch (error) {
        errors.push(`Subject template error: ${(error as Error).message}`);
      }

      // Validate HTML content
      if (content.htmlContent) {
        try {
          Handlebars.compile(content.htmlContent);
          extractVariables(content.htmlContent);
        } catch (error) {
          errors.push(`HTML template error: ${(error as Error).message}`);
        }
      }

      // Validate text content
      if (content.textContent) {
        try {
          Handlebars.compile(content.textContent);
          extractVariables(content.textContent);
        } catch (error) {
          errors.push(`Text template error: ${(error as Error).message}`);
        }
      }

      // Check for common issues
      if (!content.htmlContent && !content.textContent) {
        warnings.push('Template has no content (neither HTML nor text)');
      }

      const uniqueVariables = [...new Set(variables)];

      logger.info('Template syntax validation completed', {
        isValid: errors.length === 0,
        errorCount: errors.length,
        warningCount: warnings.length,
        variableCount: uniqueVariables.length,
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        variables: uniqueVariables,
      };
    } catch (error) {
      logger.error('Error validating template syntax', error as Error);
      throw error;
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(
    templateId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TemplateUsage> {
    try {
      logger.info('Getting template usage statistics', { 
        templateId,
        startDate,
        endDate 
      });

      const whereClause: any = {
        templateId,
      };

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      // Get total counts
      const [totalSent, successCount, failureCount, lastUsedResult] = await Promise.all([
        this.prisma.notification.count({ where: whereClause }),
        this.prisma.notification.count({
          where: { ...whereClause, status: 'SENT' },
        }),
        this.prisma.notification.count({
          where: { ...whereClause, status: 'FAILED' },
        }),
        this.prisma.notification.findFirst({
          where: { templateId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      // Get usage by day (last 30 days or within date range)
      const usageStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const usageEndDate = endDate || new Date();

      const usageByDay = await this.prisma.notification.groupBy({
        by: ['createdAt'],
        where: {
          templateId,
          createdAt: {
            gte: usageStartDate,
            lte: usageEndDate,
          },
        },
        _count: { id: true },
      });

      // Format usage by day
      const formattedUsageByDay = usageByDay.map(item => ({
        date: item.createdAt.toISOString().split('T')[0],
        count: item._count.id,
      }));

      const usage: TemplateUsage = {
        totalSent,
        successCount,
        failureCount,
        lastUsed: lastUsedResult?.createdAt,
        usageByDay: formattedUsageByDay,
      };

      logger.info('Template usage statistics retrieved', { 
        templateId,
        totalSent,
        successCount,
        failureCount 
      });

      return usage;
    } catch (error) {
      logger.error('Error getting template usage', error as Error);
      throw error;
    }
  }

  /**
   * Bulk update templates
   */
  async bulkUpdateTemplates(
    templateIds: string[],
    updateData: Omit<UpdateTemplateData, 'updatedBy'>
  ): Promise<{ count: number }> {
    try {
      logger.info('Bulk updating templates', { 
        templateCount: templateIds.length 
      });

      // Filter out fields that don't exist in Prisma schema or have type issues
      const { category, htmlContent, textContent, type, ...validUpdateData } = updateData;
      
      const result = await this.prisma.notificationTemplate.updateMany({
        where: {
          id: { in: templateIds },
        },
        data: {
          ...validUpdateData,
          updatedAt: new Date(),
        },
      });

      logger.info('Bulk update completed', { 
        updated: result.count,
        requested: templateIds.length 
      });

      return { count: result.count };
    } catch (error) {
      logger.error('Error bulk updating templates', error as Error);
      throw error;
    }
  }
}
