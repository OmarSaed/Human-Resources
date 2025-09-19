import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '@hrms/shared';

const logger = createLogger('learning-middleware');

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
 * Course creation validation schema
 */
const courseCreateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(1).max(5000).required(),
  category: Joi.string().required(),
  level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').required(),
  duration: Joi.number().min(0.5).max(1000).required(),
  language: Joi.string().default('en'),
  thumbnailUrl: Joi.string().uri().optional(),
  objectives: Joi.array().items(Joi.string()).optional(),
  prerequisites: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  price: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).optional(),
  isPublic: Joi.boolean().default(false),
  maxEnrollments: Joi.number().integer().min(1).optional(),
});

/**
 * Course update validation schema
 */
const courseUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().min(1).max(5000).optional(),
  category: Joi.string().optional(),
  level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').optional(),
  duration: Joi.number().min(0.5).max(1000).optional(),
  language: Joi.string().optional(),
  thumbnailUrl: Joi.string().uri().allow('').optional(),
  objectives: Joi.array().items(Joi.string()).optional(),
  prerequisites: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  price: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).optional(),
  isPublic: Joi.boolean().optional(),
  maxEnrollments: Joi.number().integer().min(1).allow(null).optional(),
}).min(1);

/**
 * Course content validation schema
 */
const courseContentSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional(),
  type: Joi.string().valid('VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'DOCUMENT', 'INTERACTIVE').required(),
  order: Joi.number().integer().min(1).required(),
  duration: Joi.number().min(0).optional(),
  contentUrl: Joi.string().uri().optional(),
  content: Joi.string().optional(),
  isRequired: Joi.boolean().default(true),
  isPreview: Joi.boolean().default(false),
});

/**
 * Course review validation schema
 */
const courseReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(2000).optional(),
});

/**
 * Progress update validation schema
 */
const progressUpdateSchema = Joi.object({
  contentId: Joi.string().uuid().required(),
  completed: Joi.boolean().required(),
  timeSpent: Joi.number().min(0).optional(),
  score: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().max(1000).optional(),
});

/**
 * Assessment submission validation schema
 */
const assessmentSubmissionSchema = Joi.object({
  answers: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.array().items(Joi.string())
    )
  ).required(),
  timeSpent: Joi.number().min(0).optional(),
});

/**
 * Skill validation schema
 */
const skillSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().required(),
  level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT').optional(),
  prerequisites: Joi.array().items(Joi.string().uuid()).optional(),
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
 * Permission check middleware factory
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers['x-user-role'] as string;
    
    // Simple role-based permission check
    const permissions: Record<string, string[]> = {
      'admin': ['*'],
      'instructor': ['course.create', 'course.update', 'course.delete', 'course.manage_content', 'course.publish', 'course.view_enrollments'],
      'hr_manager': ['course.create', 'course.update', 'course.view_enrollments', 'course.manage_content'],
      'hr_specialist': ['course.view_enrollments'],
      'manager': ['course.view_enrollments'],
      'employee': [],
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
 * Course enrollment check middleware
 */
export const requireEnrollment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const courseId = req.params.id || req.params.courseId;
    const userId = req.headers['x-user-id'] as string;

    // This would need to be injected with the actual service
    // For now, we'll add this to the request and let the controller handle the check
    (req as any).requiresEnrollmentCheck = { courseId, userId };
    
    next();
  } catch (error) {
    logger.error('Enrollment check failed', error as Error);
    res.status(500).json({
      error: 'Failed to verify enrollment',
      message: 'An error occurred while checking enrollment status',
    });
  }
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
  logger.error('Unhandled error in request', error as Error);

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
export const validateCourseCreate = createValidationMiddleware(courseCreateSchema);
export const validateCourseUpdate = createValidationMiddleware(courseUpdateSchema);
export const validateCourseContent = createValidationMiddleware(courseContentSchema);
export const validateCourseReview = createValidationMiddleware(courseReviewSchema);
export const validateProgressUpdate = createValidationMiddleware(progressUpdateSchema);
export const validateAssessmentSubmission = createValidationMiddleware(assessmentSubmissionSchema);
export const validateSkill = createValidationMiddleware(skillSchema);

// Query validation schemas
const searchQuerySchema = Joi.object({
  query: Joi.string().max(1000).optional(),
  category: Joi.string().optional(),
  level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').optional(),
  duration: Joi.string().pattern(/^\d+-\d+$/).optional(),
  skills: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'enrollments', 'rating').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const listQuerySchema = Joi.object({
  category: Joi.string().optional(),
  level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').optional(),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'ARCHIVED').optional(),
  instructorId: Joi.string().uuid().optional(),
  search: Joi.string().max(1000).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'enrollments').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const validateSearchQuery = createValidationMiddleware(searchQuerySchema, 'query');
export const validateListQuery = createValidationMiddleware(listQuerySchema, 'query');

// Generic validateRequest export for backwards compatibility
export const validateRequest = (schema: any) => {
  // Handle the custom schema format used in routes
  if (schema.body) {
    // Convert custom schema to Joi schema
    const joiSchema = Joi.object(
      Object.fromEntries(
        Object.entries(schema.body).map(([key, value]: [string, any]) => {
          let joi = Joi.any();
          
          if (value.type === 'string') {
            joi = Joi.string();
          } else if (value.type === 'number') {
            joi = Joi.number();
          } else if (value.type === 'boolean') {
            joi = Joi.boolean();
          } else if (value.type === 'array') {
            joi = Joi.array();
          } else if (value.type === 'object') {
            joi = Joi.object();
          }
          
          if (value.required) {
            joi = joi.required();
          } else {
            joi = joi.optional();
          }
          
          if (value.enum) {
            joi = joi.valid(...value.enum);
          }
          
          return [key, joi];
        })
      )
    );
    return createValidationMiddleware(joiSchema, 'body');
  }
  
  // Fallback to original behavior
  return createValidationMiddleware(schema);
};