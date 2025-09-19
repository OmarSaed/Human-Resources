import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '@hrms/shared';

const logger = createLogger('recruitment-middleware');

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
 * Permission check middleware factory
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers['x-user-role'] as string;
    
    // Simple role-based permission check
    const permissions: Record<string, string[]> = {
      'admin': ['*'],
      'hr_manager': [
        'job_posting.create', 'job_posting.update', 'job_posting.delete', 'job_posting.publish',
        'job_posting.view_applications', 'job_posting.view_statistics', 'job_posting.analytics',
        'candidate.create', 'candidate.update', 'candidate.delete',
        'application.create', 'application.update', 'application.delete',
        'interview.create', 'interview.update', 'interview.delete'
      ],
      'recruiter': [
        'job_posting.create', 'job_posting.update', 'job_posting.publish',
        'job_posting.view_applications', 'job_posting.view_statistics',
        'candidate.create', 'candidate.update',
        'application.create', 'application.update',
        'interview.create', 'interview.update'
      ],
      'hiring_manager': [
        'job_posting.create', 'job_posting.update', 'job_posting.publish',
        'job_posting.view_applications', 'job_posting.view_statistics',
        'application.update',
        'interview.create', 'interview.update'
      ],
      'interviewer': ['interview.update', 'application.update'],
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

// Validation schemas
const jobPostingCreateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  department: Joi.string().required(),
  location: Joi.string().required(),
  workType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE').required(),
  workArrangement: Joi.string().valid('OFFICE', 'REMOTE', 'HYBRID').required(),
  description: Joi.string().min(50).required(),
  requirements: Joi.array().items(Joi.string()).min(1).required(),
  responsibilities: Joi.array().items(Joi.string()).min(1).required(),
  qualifications: Joi.array().items(Joi.string()).min(1).required(),
  skills: Joi.array().items(Joi.string()).min(1).required(),
  salaryMin: Joi.number().min(0).optional(),
  salaryMax: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).default('USD'),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').default('NORMAL'),
  urgency: Joi.string().valid('NORMAL', 'URGENT', 'CRITICAL').default('NORMAL'),
  recruiterId: Joi.string().uuid().optional(),
});

const jobPostingUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  department: Joi.string().optional(),
  location: Joi.string().optional(),
  workType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE').optional(),
  workArrangement: Joi.string().valid('OFFICE', 'REMOTE', 'HYBRID').optional(),
  description: Joi.string().min(50).optional(),
  requirements: Joi.array().items(Joi.string()).optional(),
  responsibilities: Joi.array().items(Joi.string()).optional(),
  qualifications: Joi.array().items(Joi.string()).optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  salaryMin: Joi.number().min(0).optional(),
  salaryMax: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).optional(),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').optional(),
  urgency: Joi.string().valid('NORMAL', 'URGENT', 'CRITICAL').optional(),
  recruiterId: Joi.string().uuid().optional(),
}).min(1);

const candidateCreateSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional(),
  address: Joi.object().optional(),
  linkedInUrl: Joi.string().uri().optional(),
  portfolioUrl: Joi.string().uri().optional(),
  currentTitle: Joi.string().optional(),
  currentCompany: Joi.string().optional(),
  experience: Joi.number().min(0).optional(),
  education: Joi.array().items(Joi.object()).optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
  languages: Joi.array().items(Joi.string()).optional(),
  source: Joi.string().valid(
    'CAREER_SITE', 'JOB_BOARD', 'LINKEDIN', 'REFERRAL', 'RECRUITER', 
    'UNIVERSITY', 'SOCIAL_MEDIA', 'DIRECT_APPLICATION', 'HEADHUNTER', 'OTHER'
  ).default('CAREER_SITE'),
  referredBy: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().optional(),
});

const candidateUpdateSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  address: Joi.object().optional(),
  linkedInUrl: Joi.string().uri().allow('').optional(),
  portfolioUrl: Joi.string().uri().allow('').optional(),
  currentTitle: Joi.string().optional(),
  currentCompany: Joi.string().optional(),
  experience: Joi.number().min(0).optional(),
  education: Joi.array().items(Joi.object()).optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
  languages: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().optional(),
}).min(1);

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
  logger.error(`Unhandled error in request ${req.method} ${req.url}`, error as Error);

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
export const validateJobPostingCreate = createValidationMiddleware(jobPostingCreateSchema);
export const validateJobPostingUpdate = createValidationMiddleware(jobPostingUpdateSchema);
export const validateCandidateCreate = createValidationMiddleware(candidateCreateSchema);
export const validateCandidateUpdate = createValidationMiddleware(candidateUpdateSchema);
