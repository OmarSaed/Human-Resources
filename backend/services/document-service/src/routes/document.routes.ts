import express from 'express';
import { DocumentController } from '../controllers/document.controller';
import { DocumentService } from '../services/document.service';
import { StorageService } from '../services/storage.service';
import { WorkflowService } from '../services/workflow.service';
import { SearchService } from '../services/search.service';
import { AuditService } from '@hrms/shared';
import { authMiddleware, validateDocumentUpload, validateDocumentUpdate } from '../middleware';

export function createDocumentRoutes(
  documentService: DocumentService,
  storageService: StorageService,
  workflowService?: WorkflowService,
  searchService?: SearchService,
  auditService?: AuditService
): express.Router {
  const router = express.Router();
  
  const documentController = new DocumentController(
    documentService,
    storageService,
    workflowService,
    searchService,
    auditService
  );

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Document CRUD operations
  router.post(
    '/',
    validateDocumentUpload,
    documentController.uploadDocument
  );

  router.get(
    '/search',
    documentController.searchDocuments
  );

  router.get(
    '/metrics',
    documentController.getDocumentMetrics
  );

  router.get(
    '/',
    documentController.listDocuments
  );

  router.get(
    '/:id',
    documentController.getDocument
  );

  router.put(
    '/:id',
    validateDocumentUpdate,
    documentController.updateDocument
  );

  router.delete(
    '/:id',
    documentController.deleteDocument
  );

  // Document operations
  router.get(
    '/:id/download',
    documentController.downloadDocument
  );

  router.get(
    '/:id/preview',
    documentController.getDocumentPreview
  );

  router.post(
    '/:id/archive',
    documentController.archiveDocument
  );

  router.post(
    '/:id/restore',
    documentController.restoreDocument
  );

  // Version management
  router.get(
    '/:id/versions',
    documentController.getDocumentVersions
  );

  router.post(
    '/:id/versions',
    documentController.createDocumentVersion
  );

  return router;
}
