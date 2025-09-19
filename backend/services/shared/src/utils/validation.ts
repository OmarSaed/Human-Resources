import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { APIError } from '../types';

// Custom validation error class
export class ValidationError extends Error {
  public errors: APIError[];

  constructor(errors: APIError[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Convert Joi validation error to API errors
export const formatJoiErrors = (error: Joi.ValidationError): APIError[] => {
  return error.details.map((detail) => ({
    code: 'VALIDATION_ERROR',
    message: detail.message,
    field: detail.path.join('.'),
    details: {
      type: detail.type,
      context: detail.context,
    },
  }));
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors = formatJoiErrors(error);
      const validationError = new ValidationError(validationErrors);
      return next(validationError);
    }

    req[property] = value;
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  id: Joi.string().uuid().required().description('UUID identifier'),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),

  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .description('Valid email address'),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .description('Password must contain at least 8 characters with uppercase, lowercase, number and special character'),

  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .optional()
    .description('Valid phone number'),

  date: Joi.date().iso().description('ISO date string'),

  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

// Employee-specific validation schemas
export const employeeSchemas = {
  personalInfo: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    dateOfBirth: commonSchemas.date.optional(),
    nationalId: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      postalCode: Joi.string().required(),
    }).optional(),
  }),

  jobInfo: Joi.object({
    employeeId: Joi.string().required(),
    title: Joi.string().required(),
    department: Joi.string().required(),
    manager: Joi.string().uuid().optional(),
    startDate: commonSchemas.date.required(),
    endDate: commonSchemas.date.optional(),
    employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'intern').required(),
    salary: Joi.number().positive().optional(),
    currency: Joi.string().length(3).default('USD'),
  }),
};

// Recruitment-specific validation schemas
export const recruitmentSchemas = {
  jobPosting: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(50).required(),
    requirements: Joi.array().items(Joi.string()).min(1).required(),
    department: Joi.string().required(),
    location: Joi.string().required(),
    employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'intern').required(),
    salaryRange: Joi.object({
      min: Joi.number().positive().required(),
      max: Joi.number().positive().min(Joi.ref('min')).required(),
      currency: Joi.string().length(3).default('USD'),
    }).optional(),
    applicationDeadline: commonSchemas.date.optional(),
  }),

  candidateApplication: Joi.object({
    jobId: commonSchemas.id,
    personalInfo: employeeSchemas.personalInfo.required(),
    resume: Joi.object({
      filename: Joi.string().required(),
      url: Joi.string().uri().required(),
      size: Joi.number().positive().required(),
    }).required(),
    coverLetter: Joi.string().optional(),
    portfolio: Joi.string().uri().optional(),
    expectedSalary: Joi.number().positive().optional(),
    availableStartDate: commonSchemas.date.optional(),
  }),
};

// Performance-specific validation schemas
export const performanceSchemas = {
  goal: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(10).required(),
    targetDate: commonSchemas.date.required(),
    category: Joi.string().valid('individual', 'team', 'company').required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    measurable: Joi.boolean().default(true),
    metrics: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      target: Joi.number().required(),
      unit: Joi.string().required(),
    })).optional(),
  }),

  review: Joi.object({
    employeeId: commonSchemas.id,
    reviewerId: commonSchemas.id,
    period: Joi.object({
      startDate: commonSchemas.date.required(),
      endDate: commonSchemas.date.required(),
    }).required(),
    goals: Joi.array().items(commonSchemas.id).required(),
    selfAssessment: Joi.string().optional(),
    managerFeedback: Joi.string().optional(),
    overallRating: Joi.number().min(1).max(5).required(),
    strengths: Joi.array().items(Joi.string()).optional(),
    areasForImprovement: Joi.array().items(Joi.string()).optional(),
    developmentPlan: Joi.string().optional(),
  }),
};

// File upload validation
export const fileUploadSchema = Joi.object({
  filename: Joi.string().required(),
  mimetype: Joi.string().valid(
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ).required(),
  size: Joi.number().max(10 * 1024 * 1024).required(), // 10MB max
});
