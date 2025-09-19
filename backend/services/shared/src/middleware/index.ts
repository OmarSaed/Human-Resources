import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { APIResponse, APIError, JWTPayload, UserRole } from '../types';
import { ValidationError } from '../utils/validation';
import { config, additionalConfig } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('middleware');

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let errors: APIError[] = [];

  if (error instanceof ValidationError) {
    statusCode = 400;
    errors = error.errors;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errors = [{
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    }];
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errors = [{
      code: 'INVALID_TOKEN',
      message: 'Invalid token format',
    }];
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errors = [{
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired',
    }];
  } else {
    errors = [{
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An internal error occurred' 
        : error.message,
    }];
  }

  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    statusCode,
  });

  const response: APIResponse<null> = {
    data: null,
    errors,
  };

  res.status(statusCode).json(response);
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: APIResponse<null> = {
    data: null,
    errors: [{
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    }],
  };

  res.status(404).json(response);
};

// JWT authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('No token provided');
    error.name = 'UnauthorizedError';
    return next(error);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

// Authorization middleware factory
export const authorize = (roles: UserRole[] = [], permissions: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JWTPayload;
    
    if (!user) {
      const error = new Error('User not authenticated');
      error.name = 'UnauthorizedError';
      return next(error);
    }

    // Check roles
    if (roles.length > 0 && !roles.includes(user.role)) {
      const error = new Error('Insufficient permissions - role not authorized');
      error.name = 'ForbiddenError';
      return next(error);
    }

    // Check permissions (would need to implement permission checking logic)
    if (permissions.length > 0) {
      // This would typically check against user permissions from database
      // For now, we'll implement basic role-based permissions
      const hasPermission = checkRolePermissions(user.role, permissions);
      
      if (!hasPermission) {
        const error = new Error('Insufficient permissions');
        error.name = 'ForbiddenError';
        return next(error);
      }
    }

    next();
  };
};

// Basic role-based permission checking
const checkRolePermissions = (role: UserRole, requiredPermissions: string[]): boolean => {
  const rolePermissions: Record<UserRole, string[]> = {
    [UserRole.SUPER_ADMIN]: ['*'], // All permissions
    [UserRole.HR_MANAGER]: [
      'employee:read', 'employee:create', 'employee:update', 'employee:delete',
      'candidate:read', 'candidate:create', 'candidate:update', 'candidate:delete',
      'performance:read', 'performance:create', 'performance:update',
      'reports:read', 'reports:create'
    ],
    [UserRole.HR_SPECIALIST]: [
      'employee:read', 'employee:create', 'employee:update',
      'candidate:read', 'candidate:create', 'candidate:update',
      'performance:read', 'performance:create'
    ],
    [UserRole.DEPARTMENT_MANAGER]: [
      'employee:read', 'performance:read', 'performance:create', 'performance:update'
    ],
    [UserRole.EMPLOYEE]: [
      'employee:read:self', 'performance:read:self'
    ]
  };

  const userPermissions = rolePermissions[role] || [];
  
  // Super admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const user = (req as any).user;
    
    logger.httpRequest(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      {
        userAgent: req.get('user-agent'),
        ip: req.ip,
        userId: user?.userId,
        contentLength: res.get('content-length'),
      }
    );
  });

  next();
};

// Standard middleware setup
export const setupMiddleware = (app: express.Application): void => {
  // Security middleware
  app.use(helmet());
  
  // CORS
  app.use(cors(additionalConfig.cors));
  
  // Compression
  app.use(compression());
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: additionalConfig.rateLimit.windowMs,
    max: additionalConfig.rateLimit.max,
    message: {
      data: null,
      errors: [{
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      }],
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  
  // Request logging
  app.use(requestLogger);
};

// Health check middleware
export const healthCheck = (req: Request, res: Response): void => {
  const response: APIResponse<{ status: string; timestamp: string; uptime: number }> = {
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
  
  res.json(response);
};
