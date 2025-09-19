import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Time & Attendance Service API',
      version: '1.0.0',
      description: 'Comprehensive time tracking, attendance monitoring, and workforce management system',
      contact: {
        name: 'HRMS Development Team',
        email: 'dev@hrms.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3006',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/time-attendance',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/time-attendance',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        TimeEntry: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the time entry',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            clockIn: {
              type: 'string',
              format: 'date-time',
              description: 'Clock in timestamp',
            },
            clockOut: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Clock out timestamp',
            },
            breakStart: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Break start timestamp',
            },
            breakEnd: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Break end timestamp',
            },
            totalHours: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Total hours worked',
            },
            regularHours: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Regular hours worked',
            },
            overtimeHours: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Overtime hours worked',
            },
            breakDuration: {
              type: 'integer',
              nullable: true,
              description: 'Break duration in minutes',
            },
            workLocation: {
              type: 'string',
              enum: ['OFFICE', 'REMOTE', 'FIELD', 'CLIENT_SITE', 'HOME'],
              description: 'Work location',
            },
            deviceInfo: {
              type: 'object',
              nullable: true,
              description: 'Device information used for clock in/out',
            },
            ipAddress: {
              type: 'string',
              nullable: true,
              description: 'IP address used for clock in/out',
            },
            gpsLocation: {
              type: 'object',
              nullable: true,
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                accuracy: { type: 'number' },
                timestamp: { type: 'string', format: 'date-time' },
              },
              description: 'GPS location coordinates',
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Additional notes',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
              description: 'Time entry status',
            },
            isAutoClockOut: {
              type: 'boolean',
              description: 'Whether the clock out was automatic',
            },
            approvedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Manager who approved the entry',
            },
            approvedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Approval timestamp',
            },
            rejectedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Manager who rejected the entry',
            },
            rejectedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Rejection timestamp',
            },
            rejectionReason: {
              type: 'string',
              nullable: true,
              description: 'Reason for rejection',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        TimeCorrection: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the correction',
            },
            timeEntryId: {
              type: 'string',
              format: 'uuid',
              description: 'Time entry identifier',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            requestedBy: {
              type: 'string',
              format: 'uuid',
              description: 'User who requested the correction',
            },
            originalClockIn: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Original clock in time',
            },
            newClockIn: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Requested new clock in time',
            },
            originalClockOut: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Original clock out time',
            },
            newClockOut: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Requested new clock out time',
            },
            reason: {
              type: 'string',
              description: 'Reason for the correction',
            },
            justification: {
              type: 'string',
              nullable: true,
              description: 'Additional justification',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
              description: 'Correction status',
            },
            approvedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Manager who approved the correction',
            },
            approvedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Approval timestamp',
            },
            rejectedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Manager who rejected the correction',
            },
            rejectedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Rejection timestamp',
            },
            rejectionReason: {
              type: 'string',
              nullable: true,
              description: 'Reason for rejection',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        AttendanceRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the attendance record',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Attendance date',
            },
            status: {
              type: 'string',
              enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY'],
              description: 'Attendance status',
            },
            clockIn: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Actual clock in time',
            },
            clockOut: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Actual clock out time',
            },
            scheduledIn: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Scheduled clock in time',
            },
            scheduledOut: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Scheduled clock out time',
            },
            lateMinutes: {
              type: 'integer',
              description: 'Minutes late for clock in',
            },
            earlyMinutes: {
              type: 'integer',
              description: 'Minutes early for clock out',
            },
            totalHours: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Total hours worked',
            },
            workLocation: {
              type: 'string',
              nullable: true,
              description: 'Work location',
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Additional notes',
            },
            isHoliday: {
              type: 'boolean',
              description: 'Whether the date is a holiday',
            },
            isWeekend: {
              type: 'boolean',
              description: 'Whether the date is a weekend',
            },
            leaveRequestId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Associated leave request ID',
            },
          },
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the leave request',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            leaveTypeId: {
              type: 'string',
              format: 'uuid',
              description: 'Leave type identifier',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Leave start date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Leave end date',
            },
            totalDays: {
              type: 'number',
              format: 'decimal',
              description: 'Total leave days requested',
            },
            reason: {
              type: 'string',
              description: 'Reason for leave',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Additional description',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
              description: 'Leave request status',
            },
            emergencyContact: {
              type: 'string',
              nullable: true,
              description: 'Emergency contact during leave',
            },
            attachments: {
              type: 'array',
              items: { type: 'string' },
              description: 'Supporting document attachments',
            },
            isEmergency: {
              type: 'boolean',
              description: 'Whether this is an emergency leave',
            },
            handoverNotes: {
              type: 'string',
              nullable: true,
              description: 'Work handover notes',
            },
            backupPersonId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Backup person during leave',
            },
            approvedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Manager who approved the leave',
            },
            approvedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Approval timestamp',
            },
            rejectedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Manager who rejected the leave',
            },
            rejectedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Rejection timestamp',
            },
            rejectionReason: {
              type: 'string',
              nullable: true,
              description: 'Reason for rejection',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Number of items per page',
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                  description: 'Detailed error information',
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            message: {
              type: 'string',
              description: 'Success message',
            },
            meta: {
              type: 'object',
              properties: {
                pagination: {
                  $ref: '#/components/schemas/Pagination',
                },
              },
              description: 'Additional metadata',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Time Tracking',
        description: 'Time entry operations - clock in/out, breaks, corrections',
      },
      {
        name: 'Attendance',
        description: 'Attendance record management and monitoring',
      },
      {
        name: 'Leave Management',
        description: 'Leave request operations and leave balance tracking',
      },
      {
        name: 'Overtime',
        description: 'Overtime request and calculation operations',
      },
      {
        name: 'Schedules',
        description: 'Work schedule and shift management',
      },
      {
        name: 'Reports',
        description: 'Time and attendance reporting and analytics',
      },
      {
        name: 'Policies',
        description: 'Attendance policy management',
      },
      {
        name: 'Health',
        description: 'Service health and monitoring endpoints',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/docs/paths/*.yaml',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
