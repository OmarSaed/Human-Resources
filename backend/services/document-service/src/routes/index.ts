import express from 'express';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../docs/swagger.config';
import { DocumentService } from '../services/document.service';
import { StorageService } from '../services/storage.service';
import { WorkflowService } from '../services/workflow.service';
import { SearchService } from '../services/search.service';
import { AuditService } from '@hrms/shared';
import { createDocumentRoutes } from './document.routes';
import { createFolderRoutes } from './folder.routes';
import { createWorkflowRoutes } from './workflow.routes';
import { createRetentionRoutes } from './retention.routes';
import { createAnalyticsRoutes } from './analytics.routes';

export function createRoutes(
  prisma: PrismaClient,
  documentService: DocumentService,
  storageService: StorageService,
  workflowService?: WorkflowService,
  searchService?: SearchService,
  auditService?: AuditService
): express.Router {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'document-service',
      version: '2.0.0',
      features: {
        documentManagement: true,
        fileStorage: true,
        contentProcessing: true,
        fullTextSearch: !!searchService,
        workflowManagement: !!workflowService,
        auditLogging: !!auditService,
        retentionPolicies: true,
        analytics: true,
      },
    });
  });

  // Service info endpoint
  router.get('/info', (req, res) => {
    res.json({
      service: 'Document Management Service',
      version: '2.0.0',
      description: 'Comprehensive document management with storage, processing, and workflows',
      endpoints: {
        documents: '/api/v1/documents',
        folders: '/api/v1/folders',
        workflows: '/api/v1/workflows',
        retention: '/api/v1/retention',
        analytics: '/api/v1/analytics',
      },
      capabilities: [
        'File Upload & Storage',
        'Content Processing & Extraction',
        'Full-Text Search',
        'Version Control',
        'Document Workflows',
        'Retention Policies',
        'Audit Logging',
        'Advanced Analytics',
        'Folder Organization',
        'Permission Management',
      ],
    });
  });

  // API Documentation
  router.use('/api/docs', swaggerUi.serve);
  router.get('/api/docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HRMS Document Management Service API Documentation',
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

  // API v1 routes
  router.use('/api/v1/documents', createDocumentRoutes(
    documentService,
    storageService,
    workflowService,
    searchService,
    auditService
  ));

  router.use('/api/v1/folders', createFolderRoutes({}));

  if (workflowService) {
    router.use('/api/v1/workflows', createWorkflowRoutes({}));
  }

  router.use('/api/v1/retention', createRetentionRoutes({}));

  router.use('/api/v1/analytics', createAnalyticsRoutes({}));

  return router;
}
