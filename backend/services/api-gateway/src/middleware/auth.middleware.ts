import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const gatewayConfig = getServiceConfig('api-gateway');

const logger = createLogger('gateway-auth');

export interface GatewayUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

/**
 * Authentication middleware for API Gateway
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
        error: 'Authorization token required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, gatewayConfig.security.jwtSecret, {
      issuer: gatewayConfig.security.jwtVerifyOptions.issuer,
      audience: gatewayConfig.security.jwtVerifyOptions.audience,
    }) as any;

    // Attach user to request
    (req as any).user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId,
    } as GatewayUser;

    // Add user info to request headers for downstream services
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-session-id'] = decoded.sessionId;

    logger.debug('Token validated successfully', {
      userId: decoded.userId,
      role: decoded.role,
      path: req.path,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    logger.error('Token validation failed', error as Error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
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
      
      try {
        const decoded = jwt.verify(token, gatewayConfig.security.jwtSecret, {
          issuer: gatewayConfig.security.jwtVerifyOptions.issuer,
          audience: gatewayConfig.security.jwtVerifyOptions.audience,
        }) as any;

        (req as any).user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
          sessionId: decoded.sessionId,
        } as GatewayUser;

        req.headers['x-user-id'] = decoded.userId;
        req.headers['x-user-email'] = decoded.email;
        req.headers['x-user-role'] = decoded.role;
        req.headers['x-session-id'] = decoded.sessionId;
      } catch (error) {
        // Ignore token validation errors for optional auth
        logger.debug('Optional auth token validation failed', error as Error);
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * API Key authentication middleware
 */
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.get('X-API-Key') as string;
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key required',
      code: 'MISSING_API_KEY',
    });
    return;
  }

  if (!apiKey || typeof apiKey !== 'string') {
    logger.warn('Invalid API key used', {
      apiKey: apiKey ? String(apiKey).substring(0, 8) + '...' : 'none',
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
    return;
  }

  // Add API key info to headers
  req.headers['x-api-key'] = apiKey;
  req.headers['x-auth-type'] = 'api-key';

  logger.debug('API key validated', {
    apiKey: `${apiKey.substring(0, 8)}...`,
    path: req.path,
  });

  next();
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as GatewayUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!requiredRoles.includes(user.role)) {
      logger.warn('Insufficient role permissions', {
        userId: user.id,
        userRole: user.role,
        requiredRoles,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles,
        userRole: user.role,
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as GatewayUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const userPermissions = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(permission =>
        !userPermissions.includes(permission)
      );

      logger.warn('Insufficient permissions', {
        userId: user.id,
        userPermissions,
        requiredPermissions,
        missingPermissions,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions,
        missingPermissions,
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
 * Route protection middleware that checks route-specific permissions
 */
export const protectRoute = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user as GatewayUser;
  const method = req.method;
  const path = req.path;

  // Define route protection rules
  const protectionRules: Array<{
    pattern: RegExp;
    method?: string;
    roles?: string[];
    permissions?: string[];
  }> = [
    // Admin only routes
    {
      pattern: /^\/api\/v1\/admin/,
      roles: ['SUPER_ADMIN'],
    },
    
    // HR management routes
    {
      pattern: /^\/api\/v1\/(employees|candidates|performance|learning)$/,
      method: 'POST',
      roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST'],
    },
    
    // Employee data modification
    {
      pattern: /^\/api\/v1\/employees\/[^\/]+$/,
      method: 'PUT',
      roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST'],
    },
    
    // Reports access
    {
      pattern: /^\/api\/v1\/reports/,
      roles: ['SUPER_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER'],
    },
    
    // Analytics access
    {
      pattern: /^\/api\/v1\/analytics/,
      roles: ['SUPER_ADMIN', 'HR_MANAGER'],
    },
  ];

  // Check if route needs protection
  const matchingRule = protectionRules.find(rule => {
    const pathMatches = rule.pattern.test(path);
    const methodMatches = !rule.method || rule.method === method;
    return pathMatches && methodMatches;
  });

  if (!matchingRule) {
    // No specific protection required
    next();
    return;
  }

  // Check if user is authenticated
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required for this route',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  // Check role requirements
  if (matchingRule.roles && !matchingRule.roles.includes(user.role)) {
    res.status(403).json({
      success: false,
      error: 'Insufficient role permissions for this route',
      code: 'INSUFFICIENT_ROLE',
      requiredRoles: matchingRule.roles,
      userRole: user.role,
    });
    return;
  }

  // Check permission requirements
  if (matchingRule.permissions) {
    const userPermissions = user.permissions || [];
    const hasAllPermissions = matchingRule.permissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions for this route',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: matchingRule.permissions,
      });
      return;
    }
  }

  next();
};
