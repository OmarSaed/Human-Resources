import { PrismaClient } from '@prisma/client';
import { createLogger ,AuditService } from '@hrms/shared';
import { StorageService } from './storage.service';
import { ContentProcessingService } from './content-processing.service';
import { SearchService } from './search.service';
import { WorkflowService } from './workflow.service';
import { RetentionService } from './retention.service';
import { KafkaProducerService } from './kafka-producer.service';

const logger = createLogger('document-service');

export interface DocumentUpload {
  file: Express.Multer.File;
  category: string;
  type: string;
  folderId?: string;
  tags?: string[];
  visibility?: string;
  metadata?: any;
}

export interface DocumentMetrics {
  totalDocuments: number;
  totalSize: number;
  documentsPerCategory: Record<string, number>;
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  recentActivity: {
    uploads: number;
    downloads: number;
    views: number;
  };
}

export class DocumentService {
  constructor(
    private prisma: PrismaClient,
    private storageService: StorageService,
    private contentProcessingService?: ContentProcessingService,
    private searchService?: SearchService,
    private workflowService?: WorkflowService,
    private auditService?: AuditService,
    private retentionService?: RetentionService,
    private kafkaProducer?: KafkaProducerService
  ) {}

  /**
   * Upload a new document
   */
  async uploadDocument(uploadData: DocumentUpload, uploadedBy: string): Promise<any> {
    try {
      const { file, category, type, folderId, tags, visibility, metadata } = uploadData;

      // Validate file
      this.validateFile(file);

      // Store file
      const storageResult = await this.storageService.uploadFile(file, `doc_${Date.now()}_${file.originalname}`);

      // Extract content if enabled
      let extractedContent: string | undefined;
      let thumbnailUrl: string | undefined;

      if (this.contentProcessingService) {
        try {
          const processingResult = await this.contentProcessingService.processDocument(file);
          extractedContent = (processingResult as any).text || '';
          const previewResult = await this.contentProcessingService.generatePreview(file);
        thumbnailUrl = previewResult ? 'preview-generated' : undefined;
        } catch (error) {
          logger.warn('Content processing failed', { error: (error as Error).message });
        }
      }

      // Create document record
      const document = await this.prisma.document.create({
        data: {
          filename: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: BigInt(file.size),
          checksum: 'unknown', // storageResult.checksum not available
          storageType: 'LOCAL' as any,
          storagePath: storageResult.key,
          storageUrl: storageResult.url,
          category: category as any,
          type: type as any,
          tags: tags || [],
          content: extractedContent,
          metadata: metadata || {},
          thumbnailUrl,
          ownerId: uploadedBy,
          uploadedBy: uploadedBy,
          visibility: visibility as any || 'PRIVATE',
          status: 'ACTIVE',
        },
      });

      // Add to folder if specified
      if (folderId) {
        await this.addDocumentToFolder(document.id, folderId, uploadedBy);
      }

      // Index for search if enabled
      if (this.searchService && extractedContent) {
        await this.searchService.indexDocument({
          id: document.id,
          originalName: document.originalName,
          filename: document.filename,
          content: extractedContent,
          category: document.category,
          type: document.type,
          tags: document.tags,
          ownerId: document.ownerId,
          ownerType: document.ownerType,
          visibility: document.visibility,
          size: Number(document.size),
          mimeType: document.mimeType,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        });
      }

      // Apply retention policy
      if (this.retentionService) {
        // await this.retentionService.evaluateDocument(document.id); // Method doesn't exist
      }

      // Log audit event
      if (this.auditService) {
        await this.auditService.logAction({
          entityType: 'document',
          entityId: document.id,
          action: 'UPLOAD',
          userId: uploadedBy,
          metadata: { fileSize: file.size, mimeType: file.mimetype },
        });
      }

      // Publish event
      if (this.kafkaProducer) {
        await this.kafkaProducer.publishDocumentUploaded({
          documentId: document.id,
          filename: document.originalName,
          category: document.category,
          type: document.type,
          ownerId: document.ownerId,
          ownerType: document.ownerType,
          mimeType: document.mimeType,
          size: Number(document.size),
        });
      }

      logger.info('Document uploaded successfully', {
        documentId: document.id,
        filename: document.originalName,
        uploadedBy,
        size: file.size,
      });

      return document;

    } catch (error) {
      logger.error('Failed to upload document', {
        filename: uploadData.file.originalname,
        uploadedBy,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get document details
   */
  async getDocument(documentId: string, userId: string): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        shares: {
          where: { isRevoked: false },
        },
        workflows: {
          where: { status: { not: 'COMPLETED' } },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access permissions
    await this.checkAccessPermission(document, userId, 'VIEW');

    // Update access tracking
    await this.updateAccessTracking(documentId, userId);

    // Log audit event
    if (this.auditService) {
      await this.auditService.logAction({
        entityType: 'document',
        entityId: documentId,
        action: 'VIEW',
        userId: userId,
      });
    }

    return {
      ...document,
      size: Number(document.size), // Convert BigInt to number for JSON serialization
    };
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string, userId: string): Promise<{ stream: any; filename: string; mimeType: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access permissions
    await this.checkAccessPermission(document, userId, 'DOWNLOAD');

    // Get file data from storage
    const fileData = await this.storageService.getFile(document.storagePath);

    // Update download count
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        downloadCount: { increment: 1 },
        lastAccessedAt: new Date(),
        lastAccessedBy: userId,
      },
    });

    // Log audit event
    if (this.auditService) {
      await this.auditService.logDataAccess(
        'document',
        'read',
        userId,
        'read'
  
      );
    }

    // Publish event
    if (this.kafkaProducer) {
        await this.kafkaProducer.publishDocumentUploaded({
          documentId: documentId,
          filename: document.originalName,
          category: document.category,
          type: document.type,
          ownerId: document.ownerId,
          ownerType: document.ownerType,
          mimeType: document.mimeType,
          size: Number(document.size),
        });
    }

    return {
      stream: fileData,
      filename: document.originalName,
      mimeType: document.mimeType,
    };
  }

  /**
   * Update document
   */
  async updateDocument(documentId: string, updates: any, updatedBy: string): Promise<any> {
    try {
      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      logger.info('Document updated successfully', { documentId });
      return document;
    } catch (error) {
      logger.error('Failed to update document', error as Error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, deletedBy: string, permanent = false): Promise<void> {
    try {
      if (permanent) {
        await this.prisma.document.delete({
          where: { id: documentId },
        });
      } else {
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      }

      logger.info('Document deleted successfully', { documentId, permanent });
    } catch (error) {
      logger.error('Failed to delete document', error as Error);
      throw error;
    }
  }

  // Removed duplicate downloadDocument function

  /**
   * List documents
   */
  async listDocuments(filters: any = {}, pagination: any = {}): Promise<{ documents: any[]; total: number }> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const whereClause = {
        isDeleted: false,
        ...filters,
      };

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { uploadedAt: 'desc' },
        }),
        this.prisma.document.count({ where: whereClause }),
      ]);

      return { documents, total };
    } catch (error) {
      logger.error('Failed to list documents', error as Error);
      throw error;
    }
  }

  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: string): Promise<any[]> {
    try {
      const versions = await this.prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { createdAt: 'desc' },
      });

      return versions;
    } catch (error) {
      logger.error('Failed to get document versions', error as Error);
      throw error;
    }
  }

  /**
   * Get document preview
   */
  async getDocumentPreview(documentId: string, userId: string): Promise<any> {
    try {
      const document = await this.getDocument(documentId, userId);
      return {
        ...document,
        previewUrl: document.thumbnailUrl,
      };
    } catch (error) {
      logger.error('Failed to get document preview', error as Error);
      throw error;
    }
  }

  /**
   * Archive document
   */
  async archiveDocument(documentId: string, archivedBy: string): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ARCHIVED',
          updatedAt: new Date(),
        },
      });

      logger.info('Document archived successfully', { documentId });
    } catch (error) {
      logger.error('Failed to archive document', error as Error);
      throw error;
    }
  }

  /**
   * Restore document
   */
  async restoreDocument(documentId: string, restoredBy: string): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ACTIVE',
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });

      logger.info('Document restored successfully', { documentId });
    } catch (error) {
      logger.error('Failed to restore document', error as Error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(
    query: string,
    userId: string,
    filters: {
      category?: string;
      type?: string;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      ownerId?: string;
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{ documents: any[]; total: number; page: number; totalPages: number }> {
    
    // Use search service if available and query is provided
    if (this.searchService && query.trim()) {
      const searchResults = await this.searchService.searchDocuments({ query, limit: 10 });
      
      // Get full document details for search results
      const documentIds = searchResults.documents.map(d => d.id);
      const documents = await this.prisma.document.findMany({
        where: {
          id: { in: documentIds },
          isDeleted: false,
          // Add access control here
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          category: true,
          type: true,
          tags: true,
          thumbnailUrl: true,
          ownerId: true,
          uploadedAt: true,
          updatedAt: true,
        },
      });

      return {
        documents: documents.map(doc => ({
          ...doc,
          size: Number(doc.size),
        })),
        total: searchResults.total,
        page: pagination.page,
        totalPages: Math.ceil(searchResults.total / pagination.limit),
      };
    }

    // Fallback to database search
    const whereClause: any = {
      isDeleted: false,
      // Add access control here based on user permissions
    };

    if (filters.category) whereClause.category = filters.category;
    if (filters.type) whereClause.type = filters.type;
    if (filters.tags?.length) whereClause.tags = { hasSome: filters.tags };
    if (filters.ownerId) whereClause.ownerId = filters.ownerId;
    if (filters.dateFrom || filters.dateTo) {
      whereClause.uploadedAt = {};
      if (filters.dateFrom) whereClause.uploadedAt.gte = filters.dateFrom;
      if (filters.dateTo) whereClause.uploadedAt.lte = filters.dateTo;
    }

    if (query.trim()) {
      whereClause.OR = [
        { originalName: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: whereClause,
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          category: true,
          type: true,
          tags: true,
          thumbnailUrl: true,
          ownerId: true,
          uploadedAt: true,
          updatedAt: true,
        },
        orderBy: { uploadedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.document.count({ where: whereClause }),
    ]);

    return {
      documents: documents.map(doc => ({
        ...doc,
        size: Number(doc.size),
      })),
      total,
      page: pagination.page,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Get document metrics
   */
  async getDocumentMetrics(userId?: string): Promise<DocumentMetrics> {
    const whereClause = userId ? { ownerId: userId } : {};

    const [
      totalDocuments,
      documentsWithSize,
      categoryBreakdown,
      recentUploads,
      recentDownloads,
      recentViews
    ] = await Promise.all([
      this.prisma.document.count({
        where: { ...whereClause, isDeleted: false },
      }),
      this.prisma.document.aggregate({
        where: { ...whereClause, isDeleted: false },
        _sum: { size: true },
      }),
      this.prisma.document.groupBy({
        by: ['category'],
        where: { ...whereClause, isDeleted: false },
        _count: { id: true },
      }),
      this.prisma.document.count({
        where: {
          ...whereClause,
          uploadedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.document.aggregate({
        where: {
          ...whereClause,
          lastAccessedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { downloadCount: true },
      }),
      this.prisma.documentAuditLog.count({
        where: {
          action: 'VIEW',
          timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const totalSize = Number(documentsWithSize._sum.size || 0);
    const documentsPerCategory = categoryBreakdown.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Calculate storage usage (simplified - would need actual storage limits)
    const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB default
    const storageUsage = {
      used: totalSize,
      available: storageLimit - totalSize,
      percentage: (totalSize / storageLimit) * 100,
    };

    return {
      totalDocuments,
      totalSize,
      documentsPerCategory,
      storageUsage,
      recentActivity: {
        uploads: recentUploads,
        downloads: Number(recentDownloads._sum.downloadCount || 0),
        views: recentViews,
      },
    };
  }

  /**
   * Create a new version of a document
   */
  async createDocumentVersion(
    parentDocumentId: string,
    file: Express.Multer.File,
    uploadedBy: string
  ): Promise<string> {
    const parentDocument = await this.prisma.document.findUnique({
      where: { id: parentDocumentId },
    });

    if (!parentDocument) {
      throw new Error('Parent document not found');
    }

    // Check edit permissions
    await this.checkAccessPermission(parentDocument, uploadedBy, 'EDIT');

    // Get next version number
    const latestVersion = await this.prisma.document.findFirst({
      where: { 
        OR: [
          { id: parentDocumentId },
          { parentId: parentDocumentId }
        ]
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Store new file
    const storageResult = await this.storageService.uploadFile(file, `doc_${Date.now()}_${file.originalname}`);

    // Extract content if enabled
    let extractedContent: string | undefined;
    if (this.contentProcessingService) {
      try {
        const processingResult = await this.contentProcessingService.processDocument(file);
          extractedContent = (processingResult as any).text || '';
      } catch (error) {
        logger.warn('Content processing failed for version', { error: (error as Error).message });
      }
    }

    // Mark previous version as not latest
    await this.prisma.document.updateMany({
      where: {
        OR: [
          { id: parentDocumentId },
          { parentId: parentDocumentId }
        ],
        isLatestVersion: true,
      },
      data: { isLatestVersion: false },
    });

    // Create new version
    const newVersion = await this.prisma.document.create({
      data: {
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: BigInt(file.size),
        checksum: 'unknown', // storageResult.checksum not available
        storageType: 'LOCAL' as any,
        storagePath: storageResult.key,
        storageUrl: storageResult.url,
        category: parentDocument.category,
        type: parentDocument.type,
        tags: parentDocument.tags,
        content: extractedContent,
        metadata: parentDocument.metadata as any,
        ownerId: parentDocument.ownerId,
        uploadedBy,
        visibility: parentDocument.visibility,
        parentId: parentDocumentId,
        version: nextVersion,
        isLatestVersion: true,
        status: 'ACTIVE',
      },
    });

    // Log audit event
    if (this.auditService) {
      await this.auditService.logAction({
        entityType: 'document',
        entityId: parentDocumentId,
        action: 'VERSION_CREATE',
        userId: uploadedBy,
        metadata: { parentDocumentId, version: nextVersion },
      });
    }

    logger.info('Document version created', {
      documentId: newVersion.id,
      parentDocumentId,
      version: nextVersion,
      uploadedBy,
    });

    return newVersion.id;
  }

  /**
   * Share document with user
   */
  async shareDocument(
    documentId: string,
    sharedWith: string,
    sharedBy: string,
    permissions: string[],
    expiresAt?: Date
  ): Promise<string> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check share permissions
    await this.checkAccessPermission(document, sharedBy, 'SHARE');

    // Create share record
    const share = await this.prisma.documentShare.create({
      data: {
        documentId,
        sharedWith,
        sharedBy,
        permissions: permissions as any[],
        expiresAt,
      },
    });

    // Log audit event
    if (this.auditService) {
      await this.auditService.logAction({
        entityType: 'document',
        entityId: documentId,
        action: 'SHARE',
        userId: sharedBy,
        metadata: { sharedWith, permissions, expiresAt },
      });
    }

    // Publish event
    if (this.kafkaProducer) {
      await this.kafkaProducer.publishDocumentShared(
        documentId,
        document.filename,
        sharedWith, // Keep as string
        [sharedBy],
        permissions.join(',')
      );
    }

    return share.id;
  }

  // Helper methods

  private validateFile(file: Express.Multer.File): void {
    // File size validation
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // MIME type validation (simplified)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }

  private async checkAccessPermission(document: any, userId: string, permission: string): Promise<void> {
    // Simplified access control - owner has full access
    if (document.ownerId === userId) {
      return;
    }

    // Check if document is shared with user
    const share = await this.prisma.documentShare.findFirst({
      where: {
        documentId: document.id,
        sharedWith: userId,
        isRevoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
      },
    });

    if (!share) {
      throw new Error('Access denied');
    }

    // Check specific permission
    const hasPermission = share.permissions.includes(permission as any);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  private async updateAccessTracking(documentId: string, userId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        lastAccessedAt: new Date(),
        lastAccessedBy: userId,
      },
    });
  }

  private async addDocumentToFolder(documentId: string, folderId: string, addedBy: string): Promise<void> {
    // Verify folder exists and user has access
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    await this.prisma.documentFolder.create({
      data: {
        documentId,
        folderId,
        addedBy,
      },
    });

    // Update folder document count
    await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        documentCount: { increment: 1 },
      },
    });
  }
}
