import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '@hrms/shared';

const logger = createLogger('performance-middleware');

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
        'performance_review.create', 'performance_review.update', 'performance_review.delete',
        'goal.create', 'goal.update', 'goal.delete', 'goal.view_team', 'goal.align',
        'development_plan.create', 'development_plan.update', 'development_plan.delete', 
        'development_plan.view_team', 'development_plan.manage_activities'
      ],
      'manager': [
        'performance_review.create', 'performance_review.update',
        'goal.create', 'goal.update', 'goal.view_team', 'goal.align',
        'development_plan.create', 'development_plan.update', 'development_plan.manage_activities'
      ],
      'employee': ['goal.create', 'goal.update'],
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
const goalCreateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional(),
  category: Joi.string().valid('PERFORMANCE', 'DEVELOPMENT', 'CAREER', 'PROJECT', 'PERSONAL', 'TEAM').required(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
  targetDate: Joi.date().required(),
  employeeId: Joi.string().uuid().optional(),
  weight: Joi.number().min(0.1).max(10).optional(),
  keyResults: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      targetValue: Joi.number().required(),
      currentValue: Joi.number().default(0),
      unit: Joi.string().required(),
      isComplete: Joi.boolean().default(false),
    })
  ).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isPublic: Joi.boolean().default(false),
});

const goalUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional(),
  category: Joi.string().valid('PERFORMANCE', 'DEVELOPMENT', 'CAREER', 'PROJECT', 'PERSONAL', 'TEAM').optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  targetDate: Joi.date().optional(),
  weight: Joi.number().min(0.1).max(10).optional(),
  keyResults: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      targetValue: Joi.number().required(),
      currentValue: Joi.number().default(0),
      unit: Joi.string().required(),
      isComplete: Joi.boolean().default(false),
    })
  ).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isPublic: Joi.boolean().optional(),
}).min(1);

const developmentPlanCreateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional(),
  employeeId: Joi.string().uuid().required(),
  objectives: Joi.array().items(Joi.object()).min(1).required(),
  skills: Joi.array().items(Joi.object()).optional(),
  resources: Joi.array().items(Joi.object()).optional(),
  timeline: Joi.object().optional(),
  budget: Joi.number().min(0).optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
});

const developmentPlanUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional(),
  objectives: Joi.array().items(Joi.object()).optional(),
  skills: Joi.array().items(Joi.object()).optional(),
  resources: Joi.array().items(Joi.object()).optional(),
  timeline: Joi.object().optional(),
  budget: Joi.number().min(0).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
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
 * Error handling middleware
 */
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error(`Unhandled error in request ${req.method} ${req.url}`, error);

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
export const validateGoalCreate = createValidationMiddleware(goalCreateSchema);
export const validateGoalUpdate = createValidationMiddleware(goalUpdateSchema);
export const validateDevelopmentPlanCreate = createValidationMiddleware(developmentPlanCreateSchema);
export const validateDevelopmentPlanUpdate = createValidationMiddleware(developmentPlanUpdateSchema);
