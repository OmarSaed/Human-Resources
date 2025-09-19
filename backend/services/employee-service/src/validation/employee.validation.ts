import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '@hrms/shared';

const logger = createLogger('employee-validation');

// Employee creation validation schema
const employeeCreateSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).optional(),
  dateOfBirth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional(),
  maritalStatus: Joi.string().valid('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER').optional(),
  nationality: Joi.string().max(50).optional(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().required(),
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().optional(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
    }).optional(),
  }).optional(),
  departmentId: Joi.string().uuid().required(),
  positionId: Joi.string().uuid().required(),
  managerId: Joi.string().uuid().optional(),
  hireDate: Joi.date().required(),
  employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY').required(),
  workLocation: Joi.string().valid('OFFICE', 'REMOTE', 'HYBRID').required(),
  baseSalary: Joi.number().positive().optional(),
  currency: Joi.string().length(3).default('USD').optional(),
  payrollSchedule: Joi.string().valid('WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY').default('MONTHLY').optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  certifications: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    issuingOrganization: Joi.string().required(),
    issueDate: Joi.date().required(),
    expiryDate: Joi.date().optional(),
    credentialId: Joi.string().optional(),
    url: Joi.string().uri().optional(),
  })).optional(),
  education: Joi.array().items(Joi.object({
    institution: Joi.string().required(),
    degree: Joi.string().required(),
    fieldOfStudy: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().optional(),
    gpa: Joi.number().min(0).max(4).optional(),
    description: Joi.string().optional(),
  })).optional(),
  experience: Joi.array().items(Joi.object({
    company: Joi.string().required(),
    position: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().optional(),
    description: Joi.string().required(),
    skills: Joi.array().items(Joi.string()).optional(),
  })).optional(),
});

// Employee update validation schema
const employeeUpdateSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).optional(),
  dateOfBirth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional(),
  maritalStatus: Joi.string().valid('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER').optional(),
  nationality: Joi.string().max(50).optional(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().required(),
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().optional(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
    }).optional(),
  }).optional(),
  departmentId: Joi.string().uuid().optional(),
  positionId: Joi.string().uuid().optional(),
  managerId: Joi.string().uuid().optional(),
  employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY').optional(),
  workLocation: Joi.string().valid('OFFICE', 'REMOTE', 'HYBRID').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE', 'SUSPENDED').optional(),
  baseSalary: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  payrollSchedule: Joi.string().valid('WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY').optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  certifications: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    issuingOrganization: Joi.string().required(),
    issueDate: Joi.date().required(),
    expiryDate: Joi.date().optional(),
    credentialId: Joi.string().optional(),
    url: Joi.string().uri().optional(),
  })).optional(),
  education: Joi.array().items(Joi.object({
    institution: Joi.string().required(),
    degree: Joi.string().required(),
    fieldOfStudy: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().optional(),
    gpa: Joi.number().min(0).max(4).optional(),
    description: Joi.string().optional(),
  })).optional(),
  experience: Joi.array().items(Joi.object({
    company: Joi.string().required(),
    position: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().optional(),
    description: Joi.string().required(),
    skills: Joi.array().items(Joi.string()).optional(),
  })).optional(),
  notes: Joi.string().max(1000).optional(),
  reason: Joi.string().max(500).optional(), // For audit trail
});

/**
 * Validate employee creation data
 */
export const validateEmployeeCreate = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = employeeCreateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    logger.warn('Employee creation validation failed', {
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      })),
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid employee data',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
    });
    return;
  }

  req.body = value;
  next();
};

/**
 * Validate employee update data
 */
export const validateEmployeeUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = employeeUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    logger.warn('Employee update validation failed', {
      employeeId: req.params.id,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      })),
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid employee update data',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
    });
    return;
  }

  req.body = value;
  next();
};

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidSchema = Joi.string().uuid().required();
    
    const { error } = uuidSchema.validate(value);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: `Invalid ${paramName} format`,
        },
      });
      return;
    }
    
    next();
  };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  });

  const { error, value } = paginationSchema.validate({
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  });

  if (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Invalid pagination parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
    });
    return;
  }

  // Add validated values back to query
  Object.assign(req.query, value);
  next();
};
