import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Position create validation schema
 */
const positionCreateSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Position title is required',
      'string.min': 'Position title must be at least 2 characters',
      'string.max': 'Position title cannot exceed 100 characters',
    }),

  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),

  departmentId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'Department ID is required',
      'string.uuid': 'Department ID must be a valid UUID',
    }),

  level: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .default(1)
    .messages({
      'number.integer': 'Level must be an integer',
      'number.min': 'Level must be at least 1',
      'number.max': 'Level cannot exceed 10',
    }),

  salaryMin: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Minimum salary must be a positive number',
    }),

  salaryMax: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .when('salaryMin', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('salaryMin')).messages({
        'number.greater': 'Maximum salary must be greater than minimum salary',
      }),
    })
    .messages({
      'number.positive': 'Maximum salary must be a positive number',
    }),

  requirements: Joi.array()
    .items(Joi.string().min(1).max(200))
    .optional()
    .default([])
    .messages({
      'array.base': 'Requirements must be an array',
      'string.min': 'Each requirement must be at least 1 character',
      'string.max': 'Each requirement cannot exceed 200 characters',
    }),

  responsibilities: Joi.array()
    .items(Joi.string().min(1).max(500))
    .optional()
    .default([])
    .messages({
      'array.base': 'Responsibilities must be an array',
      'string.min': 'Each responsibility must be at least 1 character',
      'string.max': 'Each responsibility cannot exceed 500 characters',
    }),
});

/**
 * Position update validation schema
 */
const positionUpdateSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Position title must be at least 2 characters',
      'string.max': 'Position title cannot exceed 100 characters',
    }),

  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),

  departmentId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Department ID must be a valid UUID',
    }),

  level: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .messages({
      'number.integer': 'Level must be an integer',
      'number.min': 'Level must be at least 1',
      'number.max': 'Level cannot exceed 10',
    }),

  salaryMin: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .allow(null)
    .messages({
      'number.positive': 'Minimum salary must be a positive number',
    }),

  salaryMax: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .allow(null)
    .when('salaryMin', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('salaryMin')).messages({
        'number.greater': 'Maximum salary must be greater than minimum salary',
      }),
    })
    .messages({
      'number.positive': 'Maximum salary must be a positive number',
    }),

  requirements: Joi.array()
    .items(Joi.string().min(1).max(200))
    .optional()
    .messages({
      'array.base': 'Requirements must be an array',
      'string.min': 'Each requirement must be at least 1 character',
      'string.max': 'Each requirement cannot exceed 200 characters',
    }),

  responsibilities: Joi.array()
    .items(Joi.string().min(1).max(500))
    .optional()
    .messages({
      'array.base': 'Responsibilities must be an array',
      'string.min': 'Each responsibility must be at least 1 character',
      'string.max': 'Each responsibility cannot exceed 500 characters',
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
 * Validate position creation request
 */
export const validatePositionCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = positionCreateSchema.validate(req.body, {
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
          message: 'Invalid position data',
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
 * Validate position update request
 */
export const validatePositionUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = positionUpdateSchema.validate(req.body, {
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
          message: 'Invalid position update data',
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
 * Validate position query parameters
 */
export const validatePositionQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const querySchema = Joi.object({
      query: Joi.string().max(100).optional(),
      departmentId: Joi.string().uuid().optional(),
      level: Joi.number().integer().min(1).max(10).optional(),
      salaryMin: Joi.number().positive().optional(),
      salaryMax: Joi.number().positive().optional(),
      isActive: Joi.boolean().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().valid('title', 'level', 'createdAt', 'updatedAt', 'employeeCount').default('title'),
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
