import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger, getServiceConfig } from '@hrms/shared';

const logger = createLogger('employee-auth-middleware');

// Get service-specific configuration
const serviceConfig = getServiceConfig('employee-service');

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

/**
 * Authentication middleware - validates JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token required',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT token (using shared JWT secret from config)
    const decoded = jwt.verify(token, serviceConfig.jwt.secret) as any;

    // Attach user to request
    (req as any).user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId,
    } as AuthenticatedUser;

    // Add user info to request headers for downstream processing
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-session-id'] = decoded.sessionId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
      return;
    }

    logger.error('Token validation failed', error as Error);
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthenticatedUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Check if user has required permissions
    const userPermissions = user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => {
      // Check for wildcard permissions
      if (userPermissions.includes('*') || userPermissions.includes('employees.*')) {
        return true;
      }
      
      // Check for specific permission
      return userPermissions.includes(permission);
    });

    if (!hasPermission) {
      logger.warn('Insufficient permissions', {
        userId: user.id,
        userRole: user.role,
        userPermissions,
        requiredPermissions,
        endpoint: req.originalUrl,
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          requiredPermissions,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthenticatedUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!requiredRoles.includes(user.role)) {
      logger.warn('Insufficient role permissions', {
        userId: user.id,
        userRole: user.role,
        requiredRoles,
        endpoint: req.originalUrl,
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Insufficient role permissions',
          requiredRoles,
          userRole: user.role,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = requireRole(['SUPER_ADMIN']);

/**
 * HR Staff middleware
 */
export const hrStaffOnly = requireRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST']);

/**
 * Manager or above middleware
 */
export const managerOrAbove = requireRole([
  'SUPER_ADMIN',
  'HR_MANAGER', 
  'HR_SPECIALIST',
  'DEPARTMENT_MANAGER'
]);

/**
 * Resource ownership middleware - checks if user can access specific employee data
 */
export const requireResourceAccess = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user as AuthenticatedUser;
  const employeeId = req.params.id;
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // Super admin and HR staff can access all employee data
  if (['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST'].includes(user.role)) {
    next();
    return;
  }

  // Department managers can access their team members
  // (This would need additional logic to check if the employee is in their department)
  if (user.role === 'DEPARTMENT_MANAGER') {
    // TODO: Implement department membership check
    next();
    return;
  }

  // Employees can only access their own data
  if (user.role === 'EMPLOYEE') {
    // TODO: Map user ID to employee ID to check ownership
    // For now, assuming user ID matches employee ID
    if (user.id === employeeId) {
      next();
      return;
    }
  }

  res.status(403).json({
    success: false,
    error: {
      code: 'ACCESS_DENIED',
      message: 'Access denied to this resource',
    },
  });
};
