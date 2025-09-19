import { Response } from 'express';
import { APIResponse, APIError } from '../types';
import { createLogger } from './logger';

const logger = createLogger('response-handler');

/**
 * Standard API response interface
 */
export interface StandardResponse<T = any> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters?: Record<string, any>;
    sort?: string;
    searchTerm?: string;
    processingTime?: string;
  };
  errors?: APIError[];
  timestamp?: string;
  requestId?: string;
}

/**
 * Success response helper
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: StandardResponse<T>['meta']
): Response => {
  const response: StandardResponse<T> = {
    data,
    meta,
    timestamp: new Date().toISOString(),
    requestId: (res.locals.requestId || res.getHeader('X-Request-ID')) as string,
  };

  // Add performance timing if available
  if (res.locals.startTime) {
    const duration = Date.now() - res.locals.startTime;
    response.meta = {
      ...response.meta,
      processingTime: `${duration}ms`,
    };
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response helper
 */
export const sendError = (
  res: Response,
  errors: APIError | APIError[],
  statusCode: number = 500,
  additionalData?: any
): Response => {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  
  const response: StandardResponse<null> = {
    data: null,
    errors: errorArray,
    timestamp: new Date().toISOString(),
    requestId: (res.locals.requestId || res.getHeader('X-Request-ID')) as string,
    ...additionalData,
  };

  // Log error for monitoring
  logger.error('API Error Response', {
    statusCode,
    errors: errorArray,
    requestId: response.requestId,
    url: res.req?.url,
    method: res.req?.method,
  });

  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 */
export const sendValidationError = (
  res: Response,
  validationErrors: Array<{ field: string; message: string; value?: any }>
): Response => {
  const errors: APIError[] = validationErrors.map(error => ({
    code: 'VALIDATION_ERROR',
    message: error.message,
    field: error.field,
    details: error.value ? { providedValue: error.value } : undefined,
  }));

  return sendError(res, errors, 400);
};

/**
 * Not found error response
 */
export const sendNotFound = (
  res: Response,
  resource: string = 'Resource',
  identifier?: string
): Response => {
  const error: APIError = {
    code: 'NOT_FOUND',
    message: identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`,
    details: identifier ? { identifier } : undefined,
  };

  return sendError(res, error, 404);
};

/**
 * Unauthorized error response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Authentication required'
): Response => {
  const error: APIError = {
    code: 'UNAUTHORIZED',
    message,
  };

  return sendError(res, error, 401);
};

/**
 * Forbidden error response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Insufficient permissions',
  requiredPermissions?: string[]
): Response => {
  const error: APIError = {
    code: 'FORBIDDEN',
    message,
    details: requiredPermissions ? { requiredPermissions } : undefined,
  };

  return sendError(res, error, 403);
};

/**
 * Conflict error response
 */
export const sendConflict = (
  res: Response,
  message: string,
  conflictingField?: string
): Response => {
  const error: APIError = {
    code: 'CONFLICT',
    message,
    field: conflictingField,
  };

  return sendError(res, error, 409);
};

/**
 * Rate limit error response
 */
export const sendRateLimit = (
  res: Response,
  retryAfter?: number
): Response => {
  const error: APIError = {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    details: retryAfter ? { retryAfter } : undefined,
  };

  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }

  return sendError(res, error, 429);
};

/**
 * Service unavailable error response
 */
export const sendServiceUnavailable = (
  res: Response,
  message: string = 'Service temporarily unavailable',
  retryAfter?: number
): Response => {
  const error: APIError = {
    code: 'SERVICE_UNAVAILABLE',
    message,
    details: retryAfter ? { retryAfter } : undefined,
  };

  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }

  return sendError(res, error, 503);
};

/**
 * Internal server error response
 */
export const sendInternalError = (
  res: Response,
  error?: Error,
  includeStack: boolean = false
): Response => {
  const apiError: APIError = {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An internal error occurred' 
      : error?.message || 'Internal server error',
    details: includeStack && error?.stack && process.env.NODE_ENV !== 'production' 
      ? { stack: error.stack } 
      : undefined,
  };

  return sendError(res, apiError, 500);
};

/**
 * Created response helper
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  meta?: StandardResponse<T>['meta']
): Response => {
  return sendSuccess(res, data, 201, meta);
};

/**
 * No content response helper
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Paginated response helper
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  additionalMeta?: Record<string, any>
): Response => {
  return sendSuccess(res, data, 200, {
    pagination,
    ...additionalMeta,
  });
};

/**
 * Health check response helper
 */
export const sendHealthCheck = (
  res: Response,
  serviceName: string,
  version: string,
  status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy',
  additionalData?: Record<string, any>
): Response => {
  const healthData = {
    status,
    service: serviceName,
    version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ...additionalData,
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  return res.status(statusCode).json(healthData);
};

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Common HTTP status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Response timing middleware
 */
export const responseTimingMiddleware = (req: any, res: any, next: any) => {
  res.locals.startTime = Date.now();
  next();
};

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (req: any, res: any, next: any) => {
  const requestId = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
