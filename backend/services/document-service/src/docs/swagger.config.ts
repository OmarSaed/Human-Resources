import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Document Management Service API',
      version: '1.0.0',
      description: 'Comprehensive document management with file storage, versioning, workflows, and compliance features',
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
        url: 'http://localhost:3006',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/documents',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/documents',
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
        Document: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Document identifier',
            },
            name: {
              type: 'string',
              description: 'Document name',
            },
            originalName: {
              type: 'string',
              description: 'Original file name',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Document description',
            },
            type: {
              type: 'string',
              enum: ['POLICY', 'CONTRACT', 'FORM', 'CERTIFICATE', 'REPORT', 'TRAINING', 'COMPLIANCE', 'OTHER'],
              description: 'Document type',
            },
            category: {
              type: 'string',
              description: 'Document category',
            },
            mimeType: {
              type: 'string',
              description: 'MIME type of the document',
            },
            size: {
              type: 'integer',
              description: 'File size in bytes',
            },
            version: {
              type: 'integer',
              description: 'Document version number',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'DELETED'],
              description: 'Document status',
            },
            visibility: {
              type: 'string',
              enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
              description: 'Document visibility level',
            },
            folderId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Parent folder identifier',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Document tags',
            },
            metadata: {
              type: 'object',
              description: 'Additional document metadata',
            },
            checksum: {
              type: 'string',
              description: 'File checksum for integrity verification',
            },
            storageLocation: {
              type: 'string',
              description: 'Storage location path',
            },
            downloadUrl: {
              type: 'string',
              nullable: true,
              description: 'Temporary download URL',
            },
            previewUrl: {
              type: 'string',
              nullable: true,
              description: 'Document preview URL',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Document expiration timestamp',
            },
            retentionPolicy: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['DAYS', 'MONTHS', 'YEARS', 'PERMANENT'] },
                duration: { type: 'integer' },
                deleteAfter: { type: 'string', format: 'date-time' },
              },
              description: 'Document retention policy',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  permission: { type: 'string', enum: ['READ', 'WRITE', 'DELETE', 'ADMIN'] },
                },
              },
              description: 'Document permissions',
            },
            workflowId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Associated workflow identifier',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Document creator identifier',
            },
            updatedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Document updater identifier',
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
        Folder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Folder identifier',
            },
            name: {
              type: 'string',
              description: 'Folder name',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Folder description',
            },
            path: {
              type: 'string',
              description: 'Folder path',
            },
            parentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Parent folder identifier',
            },
            level: {
              type: 'integer',
              description: 'Folder hierarchy level',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  permission: { type: 'string', enum: ['READ', 'WRITE', 'DELETE', 'ADMIN'] },
                },
              },
              description: 'Folder permissions',
            },
            documentCount: {
              type: 'integer',
              description: 'Number of documents in folder',
            },
            subFolderCount: {
              type: 'integer',
              description: 'Number of subfolders',
            },
            totalSize: {
              type: 'integer',
              description: 'Total size of all documents in bytes',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Folder creator identifier',
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
        Workflow: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Workflow identifier',
            },
            name: {
              type: 'string',
              description: 'Workflow name',
            },
            description: {
              type: 'string',
              description: 'Workflow description',
            },
            type: {
              type: 'string',
              enum: ['APPROVAL', 'REVIEW', 'SIGNATURE', 'ARCHIVE', 'CUSTOM'],
              description: 'Workflow type',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'DRAFT'],
              description: 'Workflow status',
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  stepNumber: { type: 'integer' },
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['APPROVAL', 'REVIEW', 'SIGNATURE', 'NOTIFICATION'] },
                  assignedTo: { type: 'string', format: 'uuid' },
                  dueDate: { type: 'string', format: 'date-time' },
                  status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'REJECTED', 'SKIPPED'] },
                  conditions: { type: 'object' },
                },
              },
              description: 'Workflow steps',
            },
            triggers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  event: { type: 'string' },
                  conditions: { type: 'object' },
                  actions: { type: 'array', items: { type: 'string' } },
                },
              },
              description: 'Workflow triggers',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Workflow creator identifier',
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
        RetentionPolicy: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Retention policy identifier',
            },
            name: {
              type: 'string',
              description: 'Policy name',
            },
            description: {
              type: 'string',
              description: 'Policy description',
            },
            type: {
              type: 'string',
              enum: ['DAYS', 'MONTHS', 'YEARS', 'PERMANENT'],
              description: 'Retention period type',
            },
            duration: {
              type: 'integer',
              nullable: true,
              description: 'Retention duration',
            },
            triggers: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['CREATION', 'LAST_ACCESS', 'LAST_MODIFIED', 'MANUAL'],
              },
              description: 'Retention triggers',
            },
            actions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['ARCHIVE', 'DELETE', 'NOTIFY'],
              },
              description: 'Retention actions',
            },
            documentTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Applicable document types',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether policy is active',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Policy creator identifier',
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
        name: 'Documents',
        description: 'Document management operations',
      },
      {
        name: 'Folders',
        description: 'Folder and directory management',
      },
      {
        name: 'Workflows',
        description: 'Document workflow management',
      },
      {
        name: 'Retention',
        description: 'Document retention policy management',
      },
      {
        name: 'Search',
        description: 'Document search and filtering',
      },
      {
        name: 'Analytics',
        description: 'Document usage analytics',
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
