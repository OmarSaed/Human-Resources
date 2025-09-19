import Joi from 'joi';
import { commonSchemas } from '@hrms/shared';

export const authValidationSchemas = {
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
    mfaCode: Joi.string().length(6).pattern(/^\d+$/).optional(),
    rememberMe: Joi.boolean().optional(),
  }),

  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid(
      'SUPER_ADMIN',
      'HR_MANAGER', 
      'HR_SPECIALIST',
      'DEPARTMENT_MANAGER',
      'EMPLOYEE'
    ).optional(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email,
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: commonSchemas.password,
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: commonSchemas.phone,
    // Note: email, password, role should not be updatable via this endpoint
  }).min(1), // At least one field is required

  enableMFA: Joi.object({
    mfaCode: Joi.string().length(6).pattern(/^\d+$/).required(),
  }),

  disableMFA: Joi.object({
    password: Joi.string().required(),
    mfaCode: Joi.string().length(6).pattern(/^\d+$/).optional(),
  }),

  // Admin routes validation schemas
  adminCreateUser: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid(
      'SUPER_ADMIN',
      'HR_MANAGER',
      'HR_SPECIALIST', 
      'DEPARTMENT_MANAGER',
      'EMPLOYEE'
    ).required(),
  }),

  adminUpdateUser: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    email: commonSchemas.email.optional(),
    role: Joi.string().valid(
      'SUPER_ADMIN',
      'HR_MANAGER',
      'HR_SPECIALIST',
      'DEPARTMENT_MANAGER', 
      'EMPLOYEE'
    ).optional(),
    isActive: Joi.boolean().optional(),
    emailVerified: Joi.boolean().optional(),
  }).min(1),

  // Pagination and filtering
  usersList: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
    role: Joi.string().valid(
      'SUPER_ADMIN',
      'HR_MANAGER',
      'HR_SPECIALIST',
      'DEPARTMENT_MANAGER',
      'EMPLOYEE'
    ).optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid(
      'createdAt',
      'updatedAt', 
      'email',
      'firstName',
      'lastName',
      'lastLogin'
    ).default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Audit logs filtering
  auditLogs: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    userId: Joi.string().uuid().optional(),
    action: Joi.string().optional(),
    resource: Joi.string().optional(),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    success: Joi.boolean().optional(),
    sortBy: Joi.string().valid('timestamp', 'action', 'resource').default('timestamp'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Security settings
  updatePasswordPolicy: Joi.object({
    minLength: Joi.number().integer().min(6).max(128).optional(),
    requireUppercase: Joi.boolean().optional(),
    requireLowercase: Joi.boolean().optional(),
    requireNumbers: Joi.boolean().optional(),
    requireSpecialChars: Joi.boolean().optional(),
    preventReuse: Joi.number().integer().min(0).max(20).optional(),
    maxAge: Joi.number().integer().min(1).max(365).optional(),
  }).min(1),

  updateAccountLockoutPolicy: Joi.object({
    maxFailedAttempts: Joi.number().integer().min(1).max(20).optional(),
    lockoutDuration: Joi.number().integer().min(1).max(1440).optional(), // max 24 hours
    resetFailedAttemptsAfter: Joi.number().integer().min(1).max(1440).optional(),
  }).min(1),

  // Password strength check
  checkPasswordStrength: Joi.object({
    password: Joi.string().required(),
  }),

  // Force logout
  forceLogout: Joi.object({
    userId: Joi.string().uuid().required(),
    reason: Joi.string().optional(),
  }),

  // Bulk operations
  bulkUserOperation: Joi.object({
    userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
    operation: Joi.string().valid('activate', 'deactivate', 'delete', 'force_logout').required(),
    reason: Joi.string().optional(),
  }),
};
