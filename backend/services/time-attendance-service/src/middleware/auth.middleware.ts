import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '@hrms/shared';
import { timeAttendanceConfig } from '../config';

const logger = createLogger('auth-middleware');

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
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

    // Verify JWT token
    const decoded = jwt.verify(token, timeAttendanceConfig.jwt.secret) as any;

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
    try {
      const user = (req as any).user as AuthenticatedUser;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(permission => 
        user.permissions.includes(permission) || 
        user.permissions.includes('*') || // wildcard permission
        user.role === 'SUPER_ADMIN' // super admin has all permissions
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions for this action',
            required: requiredPermissions,
            current: user.permissions,
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_FAILED',
          message: 'Failed to verify permissions',
        },
      });
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user as AuthenticatedUser;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      if (!requiredRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: 'Insufficient role for this action',
            required: requiredRoles,
            current: user.role,
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role check failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_CHECK_FAILED',
          message: 'Failed to verify role',
        },
      });
    }
  };
};

/**
 * Employee ownership middleware - ensures user can only access their own data
 */
export const requireOwnership = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = (req as any).user as AuthenticatedUser;
    const employeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    // Super admin and managers can access any employee's data
    if (user.role === 'SUPER_ADMIN' || 
        user.role === 'HR_MANAGER' || 
        user.role === 'DEPT_MANAGER' ||
        user.permissions.includes('employees.read_all')) {
      next();
      return;
    }

    // Regular employees can only access their own data
    if (employeeId && employeeId !== user.id) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own data',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Ownership check failed', error as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OWNERSHIP_CHECK_FAILED',
        message: 'Failed to verify data ownership',
      },
    });
  }
};

/**
 * Manager authorization middleware - ensures user can manage specified employees
 */
export const requireManagerAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user as AuthenticatedUser;
    const targetEmployeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    // Super admin and HR managers have access to all employees
    if (user.role === 'SUPER_ADMIN' || 
        user.role === 'HR_MANAGER' ||
        user.permissions.includes('employees.manage_all')) {
      next();
      return;
    }

    // Department managers can access their team members
    if (user.role === 'DEPT_MANAGER' || user.permissions.includes('employees.manage_team')) {
      // TODO: Implement team member check with employee service
      // For now, allow department managers to access any employee
      // In production, this should verify that targetEmployeeId reports to user.id
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_MANAGER_ACCESS',
        message: 'You do not have manager access to this employee',
      },
    });
  } catch (error) {
    logger.error('Manager access check failed', error as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MANAGER_ACCESS_CHECK_FAILED',
        message: 'Failed to verify manager access',
      },
    });
  }
};

/**
 * Optional authentication middleware - sets user if token is present but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, timeAttendanceConfig.jwt.secret) as any;

    (req as any).user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId,
    } as AuthenticatedUser;

    next();
  } catch (error) {
    // If token is invalid, continue without user (optional auth)
    logger.debug('Optional auth failed, continuing without user', error as Error);
    next();
  }
};
