import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '@hrms/shared';

const logger = createLogger('notification-middleware');

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
        'notification.send', 'notification.bulk_send', 'notification.retry',
        'notification.analytics', 'notification_template.create', 'notification_template.update',
        'notification_template.delete'
      ],
      'manager': [
        'notification.send', 'notification.analytics'
      ],
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

// Validation schemas
const notificationCreateSchema = Joi.object({
  templateId: Joi.string().uuid().optional(),
  type: Joi.string().valid(
    'EMPLOYEE_WELCOME', 'EMPLOYEE_UPDATED', 'EMPLOYEE_TERMINATED',
    'RECRUITMENT_APPLICATION_RECEIVED', 'RECRUITMENT_INTERVIEW_SCHEDULED', 'RECRUITMENT_STATUS_UPDATED',
    'PERFORMANCE_REVIEW_DUE', 'PERFORMANCE_REVIEW_COMPLETED', 'PERFORMANCE_GOAL_ASSIGNED',
    'LEARNING_COURSE_ASSIGNED', 'LEARNING_COURSE_COMPLETED', 'LEARNING_CERTIFICATION_EARNED',
    'ATTENDANCE_LATE_CHECKIN', 'ATTENDANCE_MISSING_CHECKOUT', 'ATTENDANCE_LEAVE_APPROVED', 'ATTENDANCE_LEAVE_REJECTED',
    'SYSTEM_ALERT', 'SYSTEM_MAINTENANCE', 'CUSTOM'
  ).required(),
  channel: Joi.string().valid('EMAIL', 'SMS', 'PUSH', 'IN_APP').required(),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').default('NORMAL'),
  userId: Joi.string().uuid().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().optional(),
  deviceToken: Joi.string().optional(),
  subject: Joi.string().max(255).optional(),
  message: Joi.string().required(),
  data: Joi.object().optional(),
  correlationId: Joi.string().optional(),
});

const notificationTemplateCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid(
    'EMPLOYEE_WELCOME', 'EMPLOYEE_UPDATED', 'EMPLOYEE_TERMINATED',
    'RECRUITMENT_APPLICATION_RECEIVED', 'RECRUITMENT_INTERVIEW_SCHEDULED', 'RECRUITMENT_STATUS_UPDATED',
    'PERFORMANCE_REVIEW_DUE', 'PERFORMANCE_REVIEW_COMPLETED', 'PERFORMANCE_GOAL_ASSIGNED',
    'LEARNING_COURSE_ASSIGNED', 'LEARNING_COURSE_COMPLETED', 'LEARNING_CERTIFICATION_EARNED',
    'ATTENDANCE_LATE_CHECKIN', 'ATTENDANCE_MISSING_CHECKOUT', 'ATTENDANCE_LEAVE_APPROVED', 'ATTENDANCE_LEAVE_REJECTED',
    'SYSTEM_ALERT', 'SYSTEM_MAINTENANCE', 'CUSTOM'
  ).required(),
  channel: Joi.string().valid('EMAIL', 'SMS', 'PUSH', 'IN_APP').required(),
  subject: Joi.string().max(255).optional(),
  body: Joi.string().required(),
  variables: Joi.object().optional(),
  isActive: Joi.boolean().default(true),
});

const notificationTemplateUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  type: Joi.string().valid(
    'EMPLOYEE_WELCOME', 'EMPLOYEE_UPDATED', 'EMPLOYEE_TERMINATED',
    'RECRUITMENT_APPLICATION_RECEIVED', 'RECRUITMENT_INTERVIEW_SCHEDULED', 'RECRUITMENT_STATUS_UPDATED',
    'PERFORMANCE_REVIEW_DUE', 'PERFORMANCE_REVIEW_COMPLETED', 'PERFORMANCE_GOAL_ASSIGNED',
    'LEARNING_COURSE_ASSIGNED', 'LEARNING_COURSE_COMPLETED', 'LEARNING_CERTIFICATION_EARNED',
    'ATTENDANCE_LATE_CHECKIN', 'ATTENDANCE_MISSING_CHECKOUT', 'ATTENDANCE_LEAVE_APPROVED', 'ATTENDANCE_LEAVE_REJECTED',
    'SYSTEM_ALERT', 'SYSTEM_MAINTENANCE', 'CUSTOM'
  ).optional(),
  channel: Joi.string().valid('EMAIL', 'SMS', 'PUSH', 'IN_APP').optional(),
  subject: Joi.string().max(255).optional(),
  body: Joi.string().optional(),
  variables: Joi.object().optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const preferencesUpdateSchema = Joi.object({
  emailEnabled: Joi.boolean().optional(),
  smsEnabled: Joi.boolean().optional(),
  pushEnabled: Joi.boolean().optional(),
  employeeUpdates: Joi.boolean().optional(),
  systemAlerts: Joi.boolean().optional(),
  recruitmentUpdates: Joi.boolean().optional(),
  performanceUpdates: Joi.boolean().optional(),
  learningUpdates: Joi.boolean().optional(),
  attendanceAlerts: Joi.boolean().optional(),
  quietHoursStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: Joi.string().optional(),
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
  logger.error('Unhandled error in request', {
    error,
    method: req.method,
    url: req.url,
    userId: req.headers['x-user-id'],
  });

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
export const validateNotificationCreate = createValidationMiddleware(notificationCreateSchema);
export const validateNotificationTemplateCreate = createValidationMiddleware(notificationTemplateCreateSchema);
export const validateNotificationTemplateUpdate = createValidationMiddleware(notificationTemplateUpdateSchema);
export const validatePreferencesUpdate = createValidationMiddleware(preferencesUpdateSchema);
