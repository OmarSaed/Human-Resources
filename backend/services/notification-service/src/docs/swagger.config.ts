import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Notification Service API',
      version: '1.0.0',
      description: 'Comprehensive notification management with email, SMS, push notifications, and templating',
      contact: {
        name: 'HRMS Development Team',
        email: 'dev@hrms.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3005',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/notifications',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/notifications',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Notification identifier',
            },
            recipientId: {
              type: 'string',
              format: 'uuid',
              description: 'Recipient user identifier',
            },
            type: {
              type: 'string',
              enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
              description: 'Notification type',
            },
            channel: {
              type: 'string',
              enum: ['EMAIL', 'SMS', 'PUSH_NOTIFICATION', 'IN_APP', 'SLACK', 'TEAMS'],
              description: 'Notification delivery channel',
            },
            category: {
              type: 'string',
              enum: ['SYSTEM', 'REMINDER', 'ALERT', 'ANNOUNCEMENT', 'WORKFLOW', 'PERSONAL'],
              description: 'Notification category',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
              description: 'Notification priority',
            },
            subject: {
              type: 'string',
              description: 'Notification subject/title',
            },
            message: {
              type: 'string',
              description: 'Notification message content',
            },
            templateId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Template used for this notification',
            },
            templateData: {
              type: 'object',
              nullable: true,
              description: 'Data used to render the template',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'],
              description: 'Notification delivery status',
            },
            deliveryMethod: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                deviceTokens: { type: 'array', items: { type: 'string' } },
                userId: { type: 'string', format: 'uuid' },
              },
              description: 'Delivery method details',
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Scheduled delivery time',
            },
            sentAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Actual delivery time',
            },
            deliveredAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Delivery confirmation time',
            },
            readAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Read confirmation time',
            },
            metadata: {
              type: 'object',
              description: 'Additional notification metadata',
            },
            retryCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of delivery attempts',
            },
            maxRetries: {
              type: 'integer',
              minimum: 0,
              description: 'Maximum retry attempts',
            },
            lastError: {
              type: 'string',
              nullable: true,
              description: 'Last delivery error message',
            },
            isRead: {
              type: 'boolean',
              description: 'Whether notification has been read',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Notification expiration time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        NotificationTemplate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Template identifier',
            },
            name: {
              type: 'string',
              description: 'Template name',
            },
            description: {
              type: 'string',
              description: 'Template description',
            },
            type: {
              type: 'string',
              enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
              description: 'Template type',
            },
            category: {
              type: 'string',
              enum: ['SYSTEM', 'REMINDER', 'ALERT', 'ANNOUNCEMENT', 'WORKFLOW', 'PERSONAL'],
              description: 'Template category',
            },
            subject: {
              type: 'string',
              nullable: true,
              description: 'Template subject (for email)',
            },
            bodyTemplate: {
              type: 'string',
              description: 'Template body with placeholders',
            },
            htmlTemplate: {
              type: 'string',
              nullable: true,
              description: 'HTML template (for email)',
            },
            variables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['STRING', 'NUMBER', 'DATE', 'BOOLEAN'] },
                  required: { type: 'boolean' },
                  defaultValue: { type: 'string' },
                  description: { type: 'string' },
                },
              },
              description: 'Template variables',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether template is active',
            },
            language: {
              type: 'string',
              description: 'Template language',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Template tags',
            },
            version: {
              type: 'integer',
              description: 'Template version',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Template creator identifier',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        NotificationPreference: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Preference identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User identifier',
            },
            category: {
              type: 'string',
              enum: ['SYSTEM', 'REMINDER', 'ALERT', 'ANNOUNCEMENT', 'WORKFLOW', 'PERSONAL'],
              description: 'Notification category',
            },
            channels: {
              type: 'object',
              properties: {
                email: { type: 'boolean' },
                sms: { type: 'boolean' },
                push: { type: 'boolean' },
                inApp: { type: 'boolean' },
              },
              description: 'Enabled notification channels',
            },
            frequency: {
              type: 'string',
              enum: ['IMMEDIATE', 'DAILY', 'WEEKLY', 'MONTHLY', 'NEVER'],
              description: 'Notification frequency',
            },
            quietHours: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                startTime: { type: 'string', format: 'time' },
                endTime: { type: 'string', format: 'time' },
                timezone: { type: 'string' },
              },
              description: 'Quiet hours configuration',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether preference is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        NotificationQueue: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Queue job identifier',
            },
            type: {
              type: 'string',
              enum: ['SEND_EMAIL', 'SEND_SMS', 'SEND_PUSH', 'SEND_IN_APP'],
              description: 'Queue job type',
            },
            status: {
              type: 'string',
              enum: ['WAITING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED'],
              description: 'Job status',
            },
            data: {
              type: 'object',
              description: 'Job data',
            },
            priority: {
              type: 'integer',
              description: 'Job priority',
            },
            delay: {
              type: 'integer',
              description: 'Job delay in milliseconds',
            },
            attempts: {
              type: 'integer',
              description: 'Number of attempts',
            },
            maxAttempts: {
              type: 'integer',
              description: 'Maximum attempts',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            processedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Processing timestamp',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Completion timestamp',
            },
            failedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Failure timestamp',
            },
            error: {
              type: 'string',
              nullable: true,
              description: 'Error message',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Number of items per page',
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                  description: 'Detailed error information',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Notifications',
        description: 'Notification management and delivery',
      },
      {
        name: 'Templates',
        description: 'Notification template management',
      },
      {
        name: 'Preferences',
        description: 'User notification preferences',
      },
      {
        name: 'Queue',
        description: 'Notification queue management',
      },
      {
        name: 'Delivery',
        description: 'Notification delivery tracking',
      },
      {
        name: 'Health',
        description: 'Service health and monitoring',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/docs/paths/*.yaml',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
