import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Performance review create validation schema
 */
const performanceReviewCreateSchema = Joi.object({
  employeeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'Employee ID is required',
      'string.uuid': 'Employee ID must be a valid UUID',
    }),

  reviewerId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'Reviewer ID is required',
      'string.uuid': 'Reviewer ID must be a valid UUID',
    }),

  reviewPeriod: Joi.string()
    .min(1)
    .max(50)
    .required()
    .pattern(/^(Q[1-4]-\d{4}|\d{4}(-Q[1-4])?|[A-Za-z]+-\d{4})$/)
    .messages({
      'string.empty': 'Review period is required',
      'string.min': 'Review period must be at least 1 character',
      'string.max': 'Review period cannot exceed 50 characters',
      'string.pattern.base': 'Review period must be in format like "Q1-2023", "2023", or "Annual-2023"',
    }),

  reviewType: Joi.string()
    .valid('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'PROBATIONARY', 'PROJECT_BASED', 'CONTINUOUS')
    .required()
    .messages({
      'any.only': 'Review type must be one of: ANNUAL, SEMI_ANNUAL, QUARTERLY, PROBATIONARY, PROJECT_BASED, CONTINUOUS',
      'any.required': 'Review type is required',
    }),

  dueDate: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.base': 'Due date must be a valid date',
      'date.iso': 'Due date must be in ISO format',
      'date.min': 'Due date must be in the future',
      'any.required': 'Due date is required',
    }),

  goals: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().min(1).max(200).required(),
        description: Joi.string().max(1000).optional(),
        target: Joi.string().min(1).max(500).required(),
        achieved: Joi.string().max(500).optional(),
        rating: Joi.number().min(1).max(5).optional(),
        weight: Joi.number().min(0).max(1).optional(),
      })
    )
    .optional()
    .default([])
    .messages({
      'array.base': 'Goals must be an array',
    }),

  metadata: Joi.object()
    .optional()
    .messages({
      'object.base': 'Metadata must be an object',
    }),
});

/**
 * Performance review update validation schema
 */
const performanceReviewUpdateSchema = Joi.object({
  reviewerId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Reviewer ID must be a valid UUID',
    }),

  overallRating: Joi.number()
    .min(1)
    .max(5)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Overall rating must be at least 1',
      'number.max': 'Overall rating cannot exceed 5',
      'number.base': 'Overall rating must be a number',
    }),

  goals: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().min(1).max(200).required(),
        description: Joi.string().max(1000).optional(),
        target: Joi.string().min(1).max(500).required(),
        achieved: Joi.string().max(500).optional(),
        rating: Joi.number().min(1).max(5).optional(),
        weight: Joi.number().min(0).max(1).optional(),
      })
    )
    .optional()
    .messages({
      'array.base': 'Goals must be an array',
    }),

  strengths: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Strengths cannot exceed 2000 characters',
    }),

  areasForImprovement: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Areas for improvement cannot exceed 2000 characters',
    }),

  developmentPlan: Joi.string()
    .max(3000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Development plan cannot exceed 3000 characters',
    }),

  managerComments: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Manager comments cannot exceed 2000 characters',
    }),

  employeeComments: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Employee comments cannot exceed 2000 characters',
    }),

  hrComments: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'HR comments cannot exceed 2000 characters',
    }),

  status: Joi.string()
    .valid('DRAFT', 'IN_PROGRESS', 'EMPLOYEE_REVIEW', 'MANAGER_REVIEW', 'HR_REVIEW', 'COMPLETED', 'APPROVED', 'CANCELLED')
    .optional()
    .messages({
      'any.only': 'Status must be one of: DRAFT, IN_PROGRESS, EMPLOYEE_REVIEW, MANAGER_REVIEW, HR_REVIEW, COMPLETED, APPROVED, CANCELLED',
    }),

  metadata: Joi.object()
    .optional()
    .messages({
      'object.base': 'Metadata must be an object',
    }),

  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
    }),
});

/**
 * Validate performance review creation request
 */
export const validatePerformanceReviewCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = performanceReviewCreateSchema.validate(req.body, {
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
          message: 'Invalid performance review data',
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
 * Validate performance review update request
 */
export const validatePerformanceReviewUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = performanceReviewUpdateSchema.validate(req.body, {
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
          message: 'Invalid performance review update data',
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
 * Validate performance review query parameters
 */
export const validatePerformanceReviewQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const querySchema = Joi.object({
      employeeId: Joi.string().uuid().optional(),
      reviewerId: Joi.string().uuid().optional(),
      reviewType: Joi.string().valid('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'PROBATIONARY', 'PROJECT_BASED', 'CONTINUOUS').optional(),
      status: Joi.string().valid('DRAFT', 'IN_PROGRESS', 'EMPLOYEE_REVIEW', 'MANAGER_REVIEW', 'HR_REVIEW', 'COMPLETED', 'APPROVED', 'CANCELLED').optional(),
      reviewPeriod: Joi.string().max(50).optional(),
      dueDateFrom: Joi.date().iso().optional(),
      dueDateTo: Joi.date().iso().optional(),
      completedFrom: Joi.date().iso().optional(),
      completedTo: Joi.date().iso().optional(),
      overallRatingMin: Joi.number().min(1).max(5).optional(),
      overallRatingMax: Joi.number().min(1).max(5).optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().valid('createdAt', 'dueDate', 'completedAt', 'overallRating', 'reviewType', 'status').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
      days: Joi.number().integer().min(1).max(365).optional(),
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

/**
 * Validate review submission
 */
export const validateReviewSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submissionSchema = Joi.object({
      comments: Joi.string().max(1000).optional().allow(''),
    });

    const { error, value } = submissionSchema.validate(req.body, {
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
          message: 'Invalid submission data',
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
        message: 'Submission validation failed',
      },
    });
  }
};
