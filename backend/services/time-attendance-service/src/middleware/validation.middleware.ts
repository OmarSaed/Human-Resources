import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@hrms/shared';

const logger = createLogger('validation-middleware');

/**
 * Validation middleware factory for request body validation
 */
export const validateBody = (validationFunction: (data: any) => { error?: any; value: any }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = validationFunction(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.details?.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            })) || [{ message: error.message }]
          }
        });
        return;
      }

      // Replace req.body with validated and sanitized data
      req.body = value;
      next();
    } catch (validationError) {
      logger.error('Body validation middleware error', validationError as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_MIDDLEWARE_ERROR',
          message: 'Internal validation error'
        }
      });
    }
  };
};

/**
 * Validation middleware factory for query parameters validation
 */
export const validateQueryParams = (validationFunction: (data: any) => { error?: any; value: any }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = validationFunction(req.query);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'QUERY_VALIDATION_ERROR',
            message: 'Query parameter validation failed',
            details: error.details?.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            })) || [{ message: error.message }]
          }
        });
        return;
      }

      // Replace req.query with validated and sanitized data
      req.query = value as any;
      next();
    } catch (validationError) {
      logger.error('Query validation middleware error', validationError as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_MIDDLEWARE_ERROR',
          message: 'Internal validation error'
        }
      });
    }
  };
};

/**
 * Validation middleware factory for URL parameters validation
 */
export const validateParams = (validationFunction: (data: any) => { error?: any; value: any }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = validationFunction(req.params);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMS_VALIDATION_ERROR',
            message: 'URL parameter validation failed',
            details: error.details?.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            })) || [{ message: error.message }]
          }
        });
        return;
      }

      // Replace req.params with validated and sanitized data
      req.params = value;
      next();
    } catch (validationError) {
      logger.error('Params validation middleware error', validationError as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_MIDDLEWARE_ERROR',
          message: 'Internal validation error'
        }
      });
    }
  };
};

/**
 * Sanitization middleware for common security issues
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Remove potential XSS payloads from strings
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize key names to prevent prototype pollution
          const sanitizedKey = key.replace(/^__proto__|constructor|prototype$/i, '');
          if (sanitizedKey && sanitizedKey === key) {
            sanitized[sanitizedKey] = sanitizeObject(value);
          }
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (sanitizationError) {
    logger.error('Input sanitization error', sanitizationError as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Failed to sanitize input'
      }
    });
  }
};

/**
 * Request size limitation middleware
 */
export const limitRequestSize = (maxSizeInMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (contentLength > maxSizeInBytes) {
      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds maximum allowed size of ${maxSizeInMB}MB`,
          maxSize: `${maxSizeInMB}MB`,
          receivedSize: `${(contentLength / 1024 / 1024).toFixed(2)}MB`
        }
      });
      return;
    }

    next();
  };
};

/**
 * Content type validation middleware
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    // Skip validation for GET requests and requests without body
    if (req.method === 'GET' || !contentType || Object.keys(req.body || {}).length === 0) {
      next();
      return;
    }

    const isValidContentType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidContentType) {
      res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Unsupported content type',
          allowedTypes,
          receivedType: contentType
        }
      });
      return;
    }

    next();
  };
};

/**
 * UUID parameter validation middleware
 */
export const validateUUIDParams = (...paramNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    const invalidParams: string[] = [];
    
    for (const paramName of paramNames) {
      const paramValue = req.params[paramName];
      if (paramValue && !uuidRegex.test(paramValue)) {
        invalidParams.push(paramName);
      }
    }

    if (invalidParams.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UUID_PARAMS',
          message: 'Invalid UUID format in parameters',
          invalidParams
        }
      });
      return;
    }

    next();
  };
};

/**
 * Date validation middleware
 */
export const validateDateRange = (startDateField: string, endDateField: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = { ...req.query, ...req.body };
    const startDate = data[startDateField];
    const endDate = data[endDateField];

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format in date range',
            fields: [startDateField, endDateField]
          }
        });
        return;
      }

      if (start > end) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: `${startDateField} must be before ${endDateField}`,
            startDate: startDate,
            endDate: endDate
          }
        });
        return;
      }

      // Check if date range is too large (e.g., more than 1 year)
      const daysDifference = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDifference > 365) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DATE_RANGE_TOO_LARGE',
            message: 'Date range cannot exceed 365 days',
            daysDifference: Math.floor(daysDifference)
          }
        });
        return;
      }
    }

    next();
  };
};
