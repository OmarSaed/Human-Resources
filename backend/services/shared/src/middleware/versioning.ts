import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('api-versioning');

export interface VersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  headerName?: string;
  urlPrefix?: string;
  strictMode?: boolean;
}

export interface VersionedRequest extends Request {
  apiVersion: string;
  isDeprecatedVersion: boolean;
  versionSource: 'header' | 'url' | 'default';
  formatResponse?: (data: any) => any;
}

export class APIVersionManager {
  private config: VersionConfig;

  constructor(config: VersionConfig) {
    this.config = {
      headerName: 'X-API-Version',
      urlPrefix: '/api',
      strictMode: false,
      ...config,
    };

    logger.info('API Version Manager initialized', {
      defaultVersion: this.config.defaultVersion,
      supportedVersions: this.config.supportedVersions,
      deprecatedVersions: this.config.deprecatedVersions,
    });
  }

  /**
   * Create Express middleware for API versioning
   */
  createMiddleware() {
    return (req: VersionedRequest, res: Response, next: NextFunction) => {
      try {
        const version = this.extractVersion(req);
        const versionInfo = this.validateVersion(version);

        // Set version information on request
        req.apiVersion = versionInfo.version;
        req.isDeprecatedVersion = versionInfo.isDeprecated;
        req.versionSource = versionInfo.source;

        // Add version to response headers
        res.setHeader('X-API-Version', req.apiVersion);

        // Add deprecation warning if needed
        if (req.isDeprecatedVersion) {
          res.setHeader('Warning', `299 - "API version ${req.apiVersion} is deprecated"`);
          res.setHeader('Sunset', this.getDeprecationDate(req.apiVersion));
          
          logger.warn('Deprecated API version used', {
            version: req.apiVersion,
            path: req.path,
            userAgent: req.get('User-Agent'),
            clientIP: req.ip,
          });
        }

        // Log version usage
        logger.debug('API version resolved', {
          requestedVersion: version,
          resolvedVersion: req.apiVersion,
          source: req.versionSource,
          path: req.path,
        });

        next();
      } catch (error) {
        logger.error('API versioning error', {
          error: (error as Error).message,
          path: req.path,
          headers: req.headers,
        });

        if (this.config.strictMode) {
          return res.status(400).json({
            error: 'Invalid API Version',
            message: (error as Error).message,
            supportedVersions: this.config.supportedVersions,
          });
        }

        // In non-strict mode, fall back to default version
        req.apiVersion = this.config.defaultVersion;
        req.isDeprecatedVersion = this.config.deprecatedVersions.includes(this.config.defaultVersion);
        req.versionSource = 'default';
        
        return next();
      }
    };
  }

  /**
   * Extract version from request
   */
  private extractVersion(req: Request): string | null {
    // 1. Try URL-based versioning (e.g., /api/v2/users)
    const urlMatch = req.path.match(new RegExp(`^${this.config.urlPrefix!}/(v\\d+(?:\\.\\d+)?)`));
    if (urlMatch) {
      return urlMatch[1];
    }

    // 2. Try header-based versioning
    const headerVersion = req.get(this.config.headerName!);
    if (headerVersion) {
      return headerVersion;
    }

    // 3. Try query parameter
    const queryVersion = req.query.version as string;
    if (queryVersion) {
      return queryVersion;
    }

    // 4. Try Accept header versioning (e.g., application/vnd.api+json;version=2)
    const acceptHeader = req.get('Accept');
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/version=(\d+(?:\.\d+)?)/);
      if (versionMatch) {
        return `v${versionMatch[1]}`;
      }
    }

    return null;
  }

  /**
   * Validate and normalize version
   */
  private validateVersion(requestedVersion: string | null): {
    version: string;
    isDeprecated: boolean;
    source: 'header' | 'url' | 'default';
  } {
    let version = requestedVersion;
    let source: 'header' | 'url' | 'default' = 'default';

    // If no version specified, use default
    if (!version) {
      version = this.config.defaultVersion;
    } else {
      source = requestedVersion!.startsWith('v') ? 'url' : 'header';
    }

    // Normalize version format (ensure it starts with 'v')
    if (!version.startsWith('v')) {
      version = `v${version}`;
    }

    // Check if version is supported
    if (!this.config.supportedVersions.includes(version)) {
      if (this.config.strictMode) {
        throw new Error(`Unsupported API version: ${version}. Supported versions: ${this.config.supportedVersions.join(', ')}`);
      } else {
        // Fall back to default version
        version = this.config.defaultVersion;
        source = 'default';
      }
    }

    const isDeprecated = this.config.deprecatedVersions.includes(version);

    return { version, isDeprecated, source };
  }

  /**
   * Get deprecation date for a version
   */
  private getDeprecationDate(version: string): string {
    // This could be configured per version
    const deprecationMap: Record<string, string> = {
      'v1': '2024-12-31',
      'v1.0': '2024-12-31',
    };

    return deprecationMap[version] || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  /**
   * Create version-specific router
   */
  createVersionedHandler<T extends any[]>(handlers: Record<string, (...args: T) => any>) {
    return (...args: T) => {
      const req = args[0] as VersionedRequest;
      const version = req.apiVersion;

      // Find exact version match
      if (handlers[version]) {
        return handlers[version](...args);
      }

      // Find compatible version (fallback)
      const majorVersion = version.split('.')[0];
      if (handlers[majorVersion]) {
        return handlers[majorVersion](...args);
      }

      // Use default version handler
      if (handlers.default) {
        return handlers.default(...args);
      }

      // No handler found
      const res = args[1] as Response;
      return res.status(501).json({
        error: 'Version Not Implemented',
        message: `Handler for API version ${version} is not implemented`,
        supportedVersions: Object.keys(handlers),
      });
    };
  }

  /**
   * Generate version-specific response
   */
  formatResponse<T>(data: T, req: VersionedRequest): any {
    const baseResponse = {
      data,
      meta: {
        version: req.apiVersion,
        timestamp: new Date().toISOString(),
      },
    };

    // Version-specific response formatting
    switch (req.apiVersion) {
      case 'v1':
        return data; // Legacy format - just return data

      case 'v2':
      default:
        return baseResponse; // New format with metadata
    }
  }

  /**
   * Get version analytics
   */
  getVersionAnalytics(): Record<string, number> {
    // This would typically be implemented with a metrics store
    // For now, return empty object
    return {};
  }
}

/**
 * Utility function to create API versioning middleware
 */
export function createVersioningMiddleware(config: VersionConfig) {
  const versionManager = new APIVersionManager(config);
  return versionManager.createMiddleware();
}

/**
 * Decorator for version-specific route handlers
 */
export function versioned(supportedVersions: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const req = args[0] as VersionedRequest;
      
      if (!supportedVersions.includes(req.apiVersion)) {
        const res = args[1] as Response;
        return res.status(400).json({
          error: 'Unsupported Version',
          message: `This endpoint does not support API version ${req.apiVersion}`,
          supportedVersions,
        });
      }
      
      return method.apply(this, args);
    };
  };
}

/**
 * Middleware to handle version-specific business logic
 */
export function handleVersionSpecificLogic() {
  return (req: VersionedRequest, res: Response, next: NextFunction) => {
    // Add version-specific utilities to request
    req.formatResponse = (data: any) => {
      switch (req.apiVersion) {
        case 'v1':
          return data;
        case 'v2':
        default:
          return {
            data,
            meta: {
              version: req.apiVersion,
              timestamp: new Date().toISOString(),
              deprecated: req.isDeprecatedVersion,
            },
          };
      }
    };

    next();
  };
}
