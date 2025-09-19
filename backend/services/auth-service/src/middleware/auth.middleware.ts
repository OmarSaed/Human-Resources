import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@hrms/shared';
import { AuthService } from '../services/auth.service';
import { UserRole, AuthError, AuthErrorCode, AuthResponse } from '../types/auth.types';

const logger = createLogger('auth-middleware');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: AuthResponse = {
        success: false,
        errors: [{
          message: 'Authorization token required',
        }],
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.substring(7);
    const user = await AuthService.validateToken(token);

    if (!user) {
      const response: AuthResponse = {
        success: false,
        errors: [{
          message: 'Invalid or expired token',
        }],
      };
      res.status(401).json(response);
      return;
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('Authentication failed', error as Error);
    
    const response: AuthResponse = {
      success: false,
      errors: [{
        message: 'Authentication failed',
      }],
    };
    res.status(401).json(response);
  }
};

/**
 * Authorization middleware factory
 * Checks if user has required roles or permissions
 */
export const authorize = (
  requiredRoles: UserRole[] = [],
  requiredPermissions: string[] = []
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        const response: AuthResponse = {
          success: false,
          errors: [{
            message: 'User not authenticated',
          }],
        };
        res.status(401).json(response);
        return;
      }

      // Check roles
      if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.includes(user.role);
        if (!hasRequiredRole) {
          const response: AuthResponse = {
            success: false,
            errors: [{
              message: 'Insufficient permissions - role not authorized',
            }],
          };
          res.status(403).json(response);
          return;
        }
      }

      // Check permissions
      if (requiredPermissions.length > 0) {
        const userPermissions = user.permissions || [];
        const hasAllPermissions = requiredPermissions.every(permission =>
          userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
          const response: AuthResponse = {
            success: false,
            errors: [{
              message: 'Insufficient permissions',
            }],
          };
          res.status(403).json(response);
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('Authorization failed', error as Error);
      
      const response: AuthResponse = {
        success: false,
        errors: [{
          message: 'Authorization failed',
        }],
      };
      res.status(500).json(response);
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await AuthService.validateToken(token);
      
      if (user) {
        (req as any).user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize([UserRole.SUPER_ADMIN]);

/**
 * HR Staff middleware (HR Manager or HR Specialist)
 */
export const hrStaffOnly = authorize([
  UserRole.SUPER_ADMIN,
  UserRole.HR_MANAGER,
  UserRole.HR_SPECIALIST,
]);

/**
 * Manager or above middleware
 */
export const managerOrAbove = authorize([
  UserRole.SUPER_ADMIN,
  UserRole.HR_MANAGER,
  UserRole.HR_SPECIALIST,
  UserRole.DEPARTMENT_MANAGER,
]);

/**
 * Self or manager middleware
 * User can access their own data or managers can access their team's data
 */
export const selfOrManager = (getUserIdFromParams: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user;
      const targetUserId = getUserIdFromParams(req);

      if (!user) {
        const response: AuthResponse = {
          success: false,
          errors: [{
            message: 'User not authenticated',
          }],
        };
        res.status(401).json(response);
        return;
      }

      // Check if user is accessing their own data
      if (user.id === targetUserId) {
        next();
        return;
      }

      // Check if user has manager permissions
      const managerRoles = [
        UserRole.SUPER_ADMIN,
        UserRole.HR_MANAGER,
        UserRole.HR_SPECIALIST,
        UserRole.DEPARTMENT_MANAGER,
      ];

      if (managerRoles.includes(user.role)) {
        next();
        return;
      }

      const response: AuthResponse = {
        success: false,
        errors: [{
          message: 'Access denied',
        }],
      };
      res.status(403).json(response);
    } catch (error) {
      logger.error('Self or manager authorization failed', error as Error);
      
      const response: AuthResponse = {
        success: false,
        errors: [{
          message: 'Authorization failed',
        }],
      };
      res.status(500).json(response);
    }
  };
};

/**
 * Rate limiting middleware for sensitive operations
 */
export const sensitiveOperation = (req: Request, res: Response, next: NextFunction): void => {
  // This would typically integrate with express-rate-limit
  // For now, we'll just log and continue
  logger.info('Sensitive operation accessed', {
    userId: (req as any).user?.id,
    endpoint: req.path,
    method: req.method,
    ip: req.ip,
  });
  
  next();
};

/**
 * Audit middleware for logging important actions
 */
export const auditAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    
    logger.info('Audit action', {
      action,
      userId: user?.id,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  };
};
