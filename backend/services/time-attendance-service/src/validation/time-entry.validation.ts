import Joi from 'joi';

/**
 * Validation schema for time entry creation (clock in)
 */
export const timeEntryCreateSchema = Joi.object({
  employeeId: Joi.string().uuid().optional(), // Optional if extracted from token
  workLocation: Joi.string().valid('OFFICE', 'REMOTE', 'FIELD', 'CLIENT_SITE', 'HOME').default('OFFICE'),
  gpsLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().positive().optional(),
    timestamp: Joi.date().optional()
  }).optional(),
  deviceInfo: Joi.object({
    deviceId: Joi.string().optional(),
    deviceType: Joi.string().valid('MOBILE', 'DESKTOP', 'TABLET', 'KIOSK').optional(),
    userAgent: Joi.string().optional(),
    appVersion: Joi.string().optional(),
    platform: Joi.string().optional()
  }).optional(),
  notes: Joi.string().max(500).optional()
});

/**
 * Validation schema for time entry update
 */
export const timeEntryUpdateSchema = Joi.object({
  clockIn: Joi.date().optional(),
  clockOut: Joi.date().optional(),
  breakStart: Joi.date().optional(),
  breakEnd: Joi.date().optional(),
  workLocation: Joi.string().valid('OFFICE', 'REMOTE', 'FIELD', 'CLIENT_SITE', 'HOME').optional(),
  notes: Joi.string().max(500).optional(),
  gpsLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().positive().optional(),
    timestamp: Joi.date().optional()
  }).optional()
}).custom((value, helpers) => {
  // Custom validation: clockOut must be after clockIn
  if (value.clockIn && value.clockOut && value.clockOut <= value.clockIn) {
    return helpers.error('custom.clockOutBeforeClockIn');
  }

  // Custom validation: breakEnd must be after breakStart
  if (value.breakStart && value.breakEnd && value.breakEnd <= value.breakStart) {
    return helpers.error('custom.breakEndBeforeStart');
  }

  return value;
}).messages({
  'custom.clockOutBeforeClockIn': 'Clock out time must be after clock in time',
  'custom.breakEndBeforeStart': 'Break end time must be after break start time'
});

/**
 * Validation schema for time correction requests
 */
export const timeCorrectionSchema = Joi.object({
  newClockIn: Joi.date().optional(),
  newClockOut: Joi.date().optional(),
  reason: Joi.string().required().min(10).max(200),
  justification: Joi.string().optional().max(1000)
}).custom((value, helpers) => {
  // At least one time must be provided for correction
  if (!value.newClockIn && !value.newClockOut) {
    return helpers.error('custom.noTimeProvided');
  }

  // If both times provided, clockOut must be after clockIn
  if (value.newClockIn && value.newClockOut && value.newClockOut <= value.newClockIn) {
    return helpers.error('custom.clockOutBeforeClockIn');
  }

  return value;
}).messages({
  'custom.noTimeProvided': 'At least one time (clock in or clock out) must be provided for correction',
  'custom.clockOutBeforeClockIn': 'Clock out time must be after clock in time'
});

/**
 * Validation schema for time entry search/filter parameters
 */
export const timeEntrySearchSchema = Joi.object({
  employeeId: Joi.string().uuid().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  status: Joi.string().valid('ACTIVE', 'COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED').optional(),
  workLocation: Joi.string().valid('OFFICE', 'REMOTE', 'FIELD', 'CLIENT_SITE', 'HOME').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}).custom((value, helpers) => {
  // endDate must be after startDate
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    return helpers.error('custom.endDateBeforeStartDate');
  }

  return value;
}).messages({
  'custom.endDateBeforeStartDate': 'End date must be after start date'
});

/**
 * Validation schema for clock out request
 */
export const clockOutSchema = Joi.object({
  notes: Joi.string().max(500).optional(),
  gpsLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().positive().optional(),
    timestamp: Joi.date().optional()
  }).optional()
});

/**
 * Validation schema for break management
 */
export const breakSchema = Joi.object({
  notes: Joi.string().max(200).optional()
});

/**
 * Validation schema for bulk operations
 */
export const bulkOperationSchema = Joi.object({
  timeEntryIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
  action: Joi.string().valid('APPROVE', 'REJECT', 'DELETE').required(),
  reason: Joi.string().when('action', {
    is: 'REJECT',
    then: Joi.string().required().min(10).max(200),
    otherwise: Joi.string().optional().max(200)
  }),
  approvedBy: Joi.string().uuid().optional()
});

/**
 * Validation schema for time entry import
 */
export const timeEntryImportSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  date: Joi.date().required(),
  clockIn: Joi.date().required(),
  clockOut: Joi.date().required(),
  breakStart: Joi.date().optional(),
  breakEnd: Joi.date().optional(),
  workLocation: Joi.string().valid('OFFICE', 'REMOTE', 'FIELD', 'CLIENT_SITE', 'HOME').default('OFFICE'),
  notes: Joi.string().max(500).optional()
}).custom((value, helpers) => {
  // clockOut must be after clockIn
  if (value.clockOut <= value.clockIn) {
    return helpers.error('custom.clockOutBeforeClockIn');
  }

  // breakEnd must be after breakStart
  if (value.breakStart && value.breakEnd && value.breakEnd <= value.breakStart) {
    return helpers.error('custom.breakEndBeforeStart');
  }

  // Both clock times must be on the same date
  const clockInDate = new Date(value.clockIn).toDateString();
  const clockOutDate = new Date(value.clockOut).toDateString();
  const targetDate = new Date(value.date).toDateString();

  if (clockInDate !== targetDate) {
    return helpers.error('custom.clockInDateMismatch');
  }

  if (clockOutDate !== targetDate) {
    return helpers.error('custom.clockOutDateMismatch');
  }

  return value;
}).messages({
  'custom.clockOutBeforeClockIn': 'Clock out time must be after clock in time',
  'custom.breakEndBeforeStart': 'Break end time must be after break start time',
  'custom.clockInDateMismatch': 'Clock in time must be on the specified date',
  'custom.clockOutDateMismatch': 'Clock out time must be on the specified date'
});

// Validation functions
export const validateTimeEntry = (data: any) => timeEntryCreateSchema.validate(data);
export const validateTimeEntryUpdate = (data: any) => timeEntryUpdateSchema.validate(data);
export const validateTimeCorrection = (data: any) => timeCorrectionSchema.validate(data);
export const validateTimeEntrySearch = (data: any) => timeEntrySearchSchema.validate(data);
export const validateClockOut = (data: any) => clockOutSchema.validate(data);
export const validateBreak = (data: any) => breakSchema.validate(data);
export const validateBulkOperation = (data: any) => bulkOperationSchema.validate(data);
export const validateTimeEntryImport = (data: any) => timeEntryImportSchema.validate(data);
