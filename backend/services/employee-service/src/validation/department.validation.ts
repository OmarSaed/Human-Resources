import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Department create validation schema
 */
const departmentCreateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Department name is required',
      'string.min': 'Department name must be at least 2 characters',
      'string.max': 'Department name cannot exceed 100 characters',
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),

  code: Joi.string()
    .min(2)
    .max(20)
    .pattern(/^[A-Z0-9_-]+$/)
    .required()
    .messages({
      'string.empty': 'Department code is required',
      'string.min': 'Department code must be at least 2 characters',
      'string.max': 'Department code cannot exceed 20 characters',
      'string.pattern.base': 'Department code must contain only uppercase letters, numbers, hyphens, and underscores',
    }),

  managerId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Manager ID must be a valid UUID',
    }),

  budget: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Budget must be a positive number',
    }),

  location: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Location cannot exceed 200 characters',
    }),
});

/**
 * Department update validation schema
 */
const departmentUpdateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Department name must be at least 2 characters',
      'string.max': 'Department name cannot exceed 100 characters',
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),

  code: Joi.string()
    .min(2)
    .max(20)
    .pattern(/^[A-Z0-9_-]+$/)
    .optional()
    .messages({
      'string.min': 'Department code must be at least 2 characters',
      'string.max': 'Department code cannot exceed 20 characters',
      'string.pattern.base': 'Department code must contain only uppercase letters, numbers, hyphens, and underscores',
    }),

  managerId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.uuid': 'Manager ID must be a valid UUID',
    }),

  budget: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .allow(null)
    .messages({
      'number.positive': 'Budget must be a positive number',
    }),

  location: Joi.string()
    .max(200)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Location cannot exceed 200 characters',
    }),

  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
    }),

  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
    }),
});

/**
 * Validate department creation request
 */
export const validateDepartmentCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = departmentCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid department data',
          details: errorMessages,
        },
      });
      return;
    }

    req.body = value;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Validation failed',
      },
    });
  }
};

/**
 * Validate department update request
 */
export const validateDepartmentUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = departmentUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid department update data',
          details: errorMessages,
        },
      });
      return;
    }

    req.body = value;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Validation failed',
      },
    });
  }
};

/**
 * Validate department query parameters
 */
export const validateDepartmentQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const querySchema = Joi.object({
      query: Joi.string().max(100).optional(),
      managerId: Joi.string().uuid().optional(),
      isActive: Joi.boolean().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().valid('name', 'code', 'createdAt', 'updatedAt', 'employeeCount').default('name'),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    });

    const { error, value } = querySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errorMessages,
        },
      });
      return;
    }

    req.query = value;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Query validation failed',
      },
    });
  }
};
