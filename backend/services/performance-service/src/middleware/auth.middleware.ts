import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getServiceConfig } from '@hrms/shared';

// Simple logger fallback
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error),
  debug: (message: string, data?: any) => console.log(`[DEBUG] ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
};

const config = getServiceConfig('performance-service');

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Authenticate JWT token
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
        },
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // Add user info to request
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };

      // Add user info to headers for downstream services
      req.headers['x-user-id'] = req.user.id;
      req.headers['x-user-email'] = req.user.email;
      req.headers['x-user-role'] = req.user.role;

      logger.debug('User authenticated', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
      });

      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token', { error: jwtError });
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
        },
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', error as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Require specific permissions
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const userPermissions = req.user.permissions || [];
      
      // Check if user has admin role (bypasses permission checks)
      if (req.user.role === 'super_admin') {
        next();
        return;
      }

      // Check if user has all required permissions
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        logger.warn('Insufficient permissions', {
          userId: req.user.id,
          required: requiredPermissions,
          userPermissions,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            details: {
              required: requiredPermissions,
              missing: requiredPermissions.filter(p => !userPermissions.includes(p)),
            },
          },
        });
        return;
      }

      logger.debug('Permission check passed', {
        userId: req.user.id,
        requiredPermissions,
      });

      next();
    } catch (error) {
      logger.error('Permission middleware error', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Permission check failed',
        },
      });
    }
  };
};

/**
 * Require specific roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Insufficient role', {
          userId: req.user.id,
          userRole: req.user.role,
          allowedRoles,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient role privileges',
            details: {
              userRole: req.user.role,
              allowedRoles,
            },
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role middleware error', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Role check failed',
        },
      });
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        req.user = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
        };
      } catch (jwtError) {
        // Ignore JWT errors for optional auth
        logger.debug('Optional auth - invalid token ignored', { error: jwtError });
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', error as Error);
    next(); // Continue even if there's an error
  }
};
