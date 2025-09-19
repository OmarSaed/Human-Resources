import { Request, Response } from 'express';
import multer from 'multer';
import { createLogger , AuditService } from '@hrms/shared';
import { DocumentService } from '../services/document.service';
import { StorageService } from '../services/storage.service';
import { WorkflowService } from '../services/workflow.service';
import { SearchService } from '../services/search.service';

const logger = createLogger('document-controller');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now, filtering will be done in business logic
    cb(null, true);
  },
});

export class DocumentController {
  constructor(
    private documentService: DocumentService,
    private storageService: StorageService,
    private workflowService?: WorkflowService,
    private searchService?: SearchService,
    private auditService?: AuditService
  ) {}

  /**
   * Upload document
   */
  uploadDocument = [
    upload.single('file'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({
            error: 'No file provided',
            message: 'A file is required for upload',
          });
          return;
        }

        const {
          category,
          type,
          folderId,
          tags,
          visibility = 'PRIVATE',
          description,
        } = req.body;

        const userId = req.headers['x-user-id'] as string;
        const userEmail = req.headers['x-user-email'] as string;

        if (!userId) {
          res.status(401).json({
            error: 'Authentication required',
            message: 'User ID is required',
          });
          return;
        }

        // Parse tags if provided as string
        const parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];

        const uploadData = {
          file,
          category: category || 'GENERAL',
          type: type || 'DOCUMENT',
          folderId: folderId || null,
          tags: parsedTags,
          visibility,
          metadata: {
            description,
            uploadedBy: userEmail,
          },
        };

        const document = await this.documentService.uploadDocument(
          uploadData,
          userId
        );

        // Log audit event
        if (this.auditService) {
          await this.auditService.logCRUD(
            'document',
            document.id,
            userId,
            'create',
            {
              filename: document.filename,
              category: document.category,
              type: document.type,
              size: document.size,
            },
            {
              userEmail,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
            }
          );
        }

        logger.info('Document uploaded successfully', {
          documentId: document.id,
          filename: document.filename,
          userId,
        });

        res.status(201).json({
          success: true,
          document,
          message: 'Document uploaded successfully',
        });
      } catch (error) {
        logger.error('Document upload failed', error as Error);

        // Log audit failure
        if (this.auditService && req.headers['x-user-id']) {
          await this.auditService.logAction({
            entityType: 'document',
            entityId: 'upload-failed',
            action: 'upload_failed',
            userId: req.headers['x-user-id'] as string,
            metadata: {
              errorMessage: (error as Error).message,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
            }
          });
        }

        res.status(500).json({
          error: 'Upload failed',
          message: (error as Error).message,
        });
      }
    }
  ];

  /**
   * Get document by ID
   */
  getDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const document = await this.documentService.getDocument(id, userId);

      if (!document) {
        res.status(404).json({
          error: 'Document not found',
          message: 'The requested document was not found or you do not have access to it',
        });
        return;
      }

      // Log document access
      if (this.auditService) {
        await this.auditService.logDataAccess(
          'document',
          id,
          userId,
          'read',
          {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }
        );
      }

      res.json({
        success: true,
        document,
      });
    } catch (error) {
      logger.error('Failed to get document', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve document',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update document
   */
  updateDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      // Get current document for audit trail
      const currentDocument = await this.documentService.getDocument(id, userId);
      if (!currentDocument) {
        res.status(404).json({
          error: 'Document not found',
          message: 'The requested document was not found or you do not have access to it',
        });
        return;
      }

      const updatedDocument = await this.documentService.updateDocument(id, updates, userId);

      // Log audit event
      if (this.auditService) {
        await this.auditService.logCRUD(
          'document',
          id,
          userId,
          'update',
          updates,
          {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            previousValues: {
              filename: currentDocument.filename,
              category: currentDocument.category,
              type: currentDocument.type,
              tags: currentDocument.tags,
            }
          }
        );
      }

      logger.info('Document updated successfully', {
        documentId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        document: updatedDocument,
        message: 'Document updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update document', error as Error);
      res.status(500).json({
        error: 'Failed to update document',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete document
   */
  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { permanent = false } = req.query;

      const document = await this.documentService.getDocument(id, userId);
      if (!document) {
        res.status(404).json({
          error: 'Document not found',
          message: 'The requested document was not found or you do not have access to it',
        });
        return;
      }

      await this.documentService.deleteDocument(id, userId, permanent === 'true');

      // Log audit event
      if (this.auditService) {
        await this.auditService.logCRUD(
          'document',
          id,
          userId,
          'delete',
          { permanent: permanent === 'true' },
          {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }
        );
      }

      logger.info('Document deleted successfully', {
        documentId: id,
        userId,
        permanent: permanent === 'true',
      });

      res.json({
        success: true,
        message: permanent === 'true' ? 'Document permanently deleted' : 'Document moved to trash',
      });
    } catch (error) {
      logger.error('Failed to delete document', error as Error);
      res.status(500).json({
        error: 'Failed to delete document',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Download document
   */
  downloadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const { stream, filename, mimeType } = await this.documentService.downloadDocument(id, userId);

      // Log document access
      if (this.auditService) {
        await this.auditService.logDataAccess(
          'document',
          id,
          userId,
          'read',
          {
            action: 'download',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }
        );
      }

      // Set appropriate headers
      res.setHeader('Content-Type', mimeType);
      // res.setHeader('Content-Length', stream.length); // Stream doesn't have length"
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.send(stream);

      logger.info('Document downloaded successfully', {
        documentId: id,
        filename: filename,
        userId,
      });
    } catch (error) {
      logger.error('Failed to download document', error as Error);
      res.status(500).json({
        error: 'Failed to download document',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Search documents
   */
  searchDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        query,
        category,
        type,
        tags,
        dateFrom,
        dateTo,
        sizeMin,
        sizeMax,
        mimeTypes,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const searchQuery = {
        query: query as string,
        category: category as string,
        type: type as string,
        tags: tags ? (tags as string).split(',') : undefined,
        ownerId: userId, // Only search user's documents by default
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        sizeMin: sizeMin ? parseInt(sizeMin as string) : undefined,
        sizeMax: sizeMax ? parseInt(sizeMax as string) : undefined,
        mimeTypes: mimeTypes ? (mimeTypes as string).split(',') : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 results per page
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      let result;
      if (this.searchService) {
        result = await this.searchService.searchDocuments(searchQuery);
      } else {
        // Fallback to database search
        result = await this.documentService.searchDocuments(query as string, userId, searchQuery);
      }

      // Log search event
      if (this.auditService) {
        await this.auditService.logDataAccess(
          'document',
          'search',
          userId,
          'search',
          {
            query: query as string,
            resultCount: result.total,
            filters: searchQuery,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }
        );
      }

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Document search failed', error as Error);
      res.status(500).json({
        error: 'Search failed',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List documents
   */
  listDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        folderId,
        category,
        type,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeArchived = false,
        includeDeleted = false,
      } = req.query;

      const options = {
        folderId: folderId as string,
        category: category as string,
        type: type as string,
        ownerId: userId,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        includeArchived: includeArchived === 'true',
        includeDeleted: includeDeleted === 'true',
      };

      const result = await this.documentService.listDocuments(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list documents', error as Error);
      res.status(500).json({
        error: 'Failed to list documents',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get document versions
   */
  getDocumentVersions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const versions = await this.documentService.getDocumentVersions(id);

      res.json({
        success: true,
        versions,
      });
    } catch (error) {
      logger.error('Failed to get document versions', error as Error);
      res.status(500).json({
        error: 'Failed to get document versions',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Create document version
   */
  createDocumentVersion = [
    upload.single('file'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const file = req.file;
        const userId = req.headers['x-user-id'] as string;
        const { comment } = req.body;

        if (!file) {
          res.status(400).json({
            error: 'No file provided',
            message: 'A file is required to create a new version',
          });
          return;
        }

        const version = await this.documentService.createDocumentVersion(
          id,
          file,
          userId
        );

        logger.info('Document version created successfully', {
          documentId: id,
          versionNumber: 1, // Default version
          userId,
        });

        res.status(201).json({
          success: true,
          version,
          message: 'Document version created successfully',
        });
      } catch (error) {
        logger.error('Failed to create document version', error as Error);
        res.status(500).json({
          error: 'Failed to create document version',
          message: (error as Error).message,
        });
      }
    }
  ];

  /**
   * Get document metrics
   */
  getDocumentMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;

      const metrics = await this.documentService.getDocumentMetrics(userId);

      res.json({
        success: true,
        metrics,
      });
    } catch (error) {
      logger.error('Failed to get document metrics', error as Error);
      res.status(500).json({
        error: 'Failed to get document metrics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get document preview
   */
  getDocumentPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const preview = await this.documentService.getDocumentPreview(id, userId);

      if (!preview) {
        res.status(404).json({
          error: 'Preview not available',
          message: 'Preview is not available for this document',
        });
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      res.send(preview);
    } catch (error) {
      logger.error('Failed to get document preview', error as Error);
      res.status(500).json({
        error: 'Failed to get document preview',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Archive document
   */
  archiveDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.documentService.archiveDocument(id, userId);

      // Log audit event
      if (this.auditService) {
        await this.auditService.logAction({
          entityType: 'document',
          entityId: id,
          action: 'archive',
          userId,
          changes: { archived: true },
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }
        });
      }

      logger.info('Document archived successfully', { documentId: id, userId });

      res.json({
        success: true,
        message: 'Document archived successfully',
      });
    } catch (error) {
      logger.error('Failed to archive document', error as Error);
      res.status(500).json({
        error: 'Failed to archive document',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Restore document
   */
  restoreDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.documentService.restoreDocument(id, userId);

      // Log audit event
      if (this.auditService) {
        await this.auditService.logAction({
          entityType: 'document',
          entityId: id,
          action: 'restore',
          userId,
          changes: { restored: true },
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }
        });
      }

      logger.info('Document restored successfully', { documentId: id, userId });

      res.json({
        success: true,
        message: 'Document restored successfully',
      });
    } catch (error) {
      logger.error('Failed to restore document', error as Error);
      res.status(500).json({
        error: 'Failed to restore document',
        message: (error as Error).message,
      });
    }
  };
}
