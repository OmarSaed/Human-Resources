import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '@hrms/shared';

const logger = createLogger('document-middleware');

/**
 * Authentication middleware
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User ID header is required',
    });
    return;
  }

  // Add user info to request for downstream use
  (req as any).user = {
    id: userId,
    email: req.headers['x-user-email'],
    role: req.headers['x-user-role'],
  };

  next();
};

/**
 * Document upload validation schema
 */
const documentUploadSchema = Joi.object({
  category: Joi.string().valid('PERSONAL', 'HR', 'LEGAL', 'FINANCIAL', 'PROJECT', 'GENERAL').optional().default('GENERAL'),
  type: Joi.string().valid('DOCUMENT', 'IMAGE', 'SPREADSHEET', 'PRESENTATION', 'PDF', 'CONTRACT', 'REPORT', 'OTHER').optional().default('DOCUMENT'),
  folderId: Joi.string().uuid().optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  visibility: Joi.string().valid('PRIVATE', 'INTERNAL', 'PUBLIC').optional().default('PRIVATE'),
  description: Joi.string().max(1000).optional(),
});

/**
 * Document update validation schema
 */
const documentUpdateSchema = Joi.object({
  filename: Joi.string().min(1).max(255).optional(),
  category: Joi.string().valid('PERSONAL', 'HR', 'LEGAL', 'FINANCIAL', 'PROJECT', 'GENERAL').optional(),
  type: Joi.string().valid('DOCUMENT', 'IMAGE', 'SPREADSHEET', 'PRESENTATION', 'PDF', 'CONTRACT', 'REPORT', 'OTHER').optional(),
  folderId: Joi.string().uuid().allow(null).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  visibility: Joi.string().valid('PRIVATE', 'INTERNAL', 'PUBLIC').optional(),
  description: Joi.string().max(1000).allow('').optional(),
}).min(1); // At least one field must be provided

/**
 * Folder creation validation schema
 */
const folderCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  parentId: Joi.string().uuid().allow(null).optional(),
  description: Joi.string().max(1000).optional(),
  visibility: Joi.string().valid('PRIVATE', 'INTERNAL', 'PUBLIC').optional().default('PRIVATE'),
});

/**
 * Folder update validation schema
 */
const folderUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  parentId: Joi.string().uuid().allow(null).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  visibility: Joi.string().valid('PRIVATE', 'INTERNAL', 'PUBLIC').optional(),
}).min(1);

/**
 * Workflow template validation schema
 */
const workflowTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  documentCategory: Joi.string().optional(),
  documentType: Joi.string().optional(),
  trigger: Joi.string().valid('upload', 'update', 'review', 'expiry', 'manual').required(),
  steps: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      type: Joi.string().valid('approval', 'review', 'notification', 'action').required(),
      assigneeType: Joi.string().valid('user', 'role', 'department', 'system').required(),
      assigneeId: Joi.string().required(),
      order: Joi.number().integer().min(1).required(),
      isRequired: Joi.boolean().default(true),
      timeoutHours: Joi.number().integer().min(1).optional(),
      autoApprove: Joi.boolean().default(false),
      conditions: Joi.object().optional(),
    })
  ).min(1).required(),
  isActive: Joi.boolean().default(true),
});

/**
 * Retention policy validation schema
 */
const retentionPolicySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  documentCategory: Joi.string().optional(),
  documentType: Joi.string().optional(),
  retentionPeriodDays: Joi.number().integer().min(1).required(),
  action: Joi.string().valid('delete', 'archive', 'review').required(),
  isActive: Joi.boolean().default(true),
  conditions: Joi.array().items(
    Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than').required(),
      value: Joi.any().required(),
    })
  ).optional(),
});

/**
 * Generic validation middleware factory
 */
const createValidationMiddleware = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn('Validation failed', {
        property,
        errors: error.details,
        originalValue: req[property],
      });

      res.status(400).json({
        error: 'Validation failed',
        message: 'Request data is invalid',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })),
      });
      return;
    }

    // Replace the original data with validated and transformed data
    req[property] = value;
    next();
  };
};

/**
 * File validation middleware
 */
export const validateFile = (req: Request, res: Response, next: NextFunction): void => {
  const file = req.file;
  
  if (!file) {
    res.status(400).json({
      error: 'File required',
      message: 'A file must be provided for upload',
    });
    return;
  }

  // Check file size (100MB max)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    res.status(400).json({
      error: 'File too large',
      message: `File size must be less than ${maxSize / 1024 / 1024}MB`,
    });
    return;
  }

  // Check for potentially dangerous file types
  const dangerousTypes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
  ];

  if (dangerousTypes.includes(file.mimetype)) {
    res.status(400).json({
      error: 'File type not allowed',
      message: 'Executable files are not permitted',
    });
    return;
  }

  next();
};

/**
 * Permission check middleware factory
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers['x-user-role'] as string;
    
    // Simple role-based permission check
    // In a real implementation, this would check against a proper permission system
    const permissions: Record<string, string[]> = {
      'admin': ['*'],
      'hr_manager': ['document.read', 'document.write', 'document.delete', 'workflow.manage', 'retention.manage'],
      'hr_specialist': ['document.read', 'document.write', 'workflow.participate'],
      'manager': ['document.read', 'document.write', 'workflow.participate'],
      'employee': ['document.read', 'document.write'],
    };

    const userPermissions = permissions[userRole] || [];
    
    if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Permission '${permission}' is required for this operation`,
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting middleware (simple implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req.ip || 'unknown') + (req.headers['x-user-id'] || '');
    const now = Date.now();
    
    const userLimit = rateLimitStore.get(key);
    
    if (!userLimit || now > userLimit.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
      return;
    }

    userLimit.count++;
    next();
  };
};

/**
 * Error handling middleware
 */
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error in request', error);

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    requestId: (req as any).requestId,
  });
};

/**
 * Not found middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.url} not found`,
  });
};

// Export validation middlewares
export const validateDocumentUpload = createValidationMiddleware(documentUploadSchema);
export const validateDocumentUpdate = createValidationMiddleware(documentUpdateSchema);
export const validateFolderCreate = createValidationMiddleware(folderCreateSchema);
export const validateFolderUpdate = createValidationMiddleware(folderUpdateSchema);
export const validateWorkflowTemplate = createValidationMiddleware(workflowTemplateSchema);
export const validateRetentionPolicy = createValidationMiddleware(retentionPolicySchema);

// Query validation schemas
const searchQuerySchema = Joi.object({
  query: Joi.string().max(1000).optional(),
  category: Joi.string().optional(),
  type: Joi.string().optional(),
  tags: Joi.string().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  sizeMin: Joi.number().integer().min(0).optional(),
  sizeMax: Joi.number().integer().min(0).optional(),
  mimeTypes: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'filename', 'size').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const validateSearchQuery = createValidationMiddleware(searchQuerySchema, 'query');
