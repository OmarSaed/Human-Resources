import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Authentication Service API',
      version: '1.0.0',
      description: 'Comprehensive authentication and authorization service with JWT, MFA, and RBAC support',
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
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/auth',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/auth',
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
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            role: {
              type: 'string',
              enum: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPT_MANAGER', 'EMPLOYEE'],
              description: 'User role',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active',
            },
            emailVerified: {
              type: 'boolean',
              description: 'Whether the email is verified',
            },
            mfaEnabled: {
              type: 'boolean',
              description: 'Whether MFA is enabled',
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last login timestamp',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password',
            },
            rememberMe: {
              type: 'boolean',
              default: false,
              description: 'Whether to remember the user session',
            },
            deviceInfo: {
              type: 'object',
              properties: {
                deviceId: { type: 'string' },
                deviceType: { type: 'string' },
                userAgent: { type: 'string' },
                platform: { type: 'string' },
              },
              description: 'Device information for tracking',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: {
                      type: 'string',
                      description: 'JWT access token',
                    },
                    refreshToken: {
                      type: 'string',
                      description: 'JWT refresh token',
                    },
                    expiresIn: {
                      type: 'integer',
                      description: 'Token expiration time in seconds',
                    },
                  },
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'User permissions',
                },
                sessionId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Session identifier',
                },
                requiresMfa: {
                  type: 'boolean',
                  description: 'Whether MFA verification is required',
                },
              },
            },
            message: {
              type: 'string',
              description: 'Success message',
            },
          },
        },
        MfaSetupRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            password: {
              type: 'string',
              description: 'Current password for verification',
            },
          },
        },
        MfaSetupResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                secret: {
                  type: 'string',
                  description: 'Base32 encoded secret for TOTP',
                },
                qrCode: {
                  type: 'string',
                  description: 'QR code data URL for authenticator apps',
                },
                backupCodes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Backup recovery codes',
                },
              },
            },
          },
        },
        MfaVerifyRequest: {
          type: 'object',
          required: ['code'],
          properties: {
            code: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              pattern: '^[0-9]{6}$',
              description: 'TOTP code from authenticator app',
            },
            sessionId: {
              type: 'string',
              format: 'uuid',
              description: 'Session ID from initial login',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password',
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'User last name',
            },
            role: {
              type: 'string',
              enum: ['HR_SPECIALIST', 'DEPT_MANAGER', 'EMPLOYEE'],
              default: 'EMPLOYEE',
              description: 'Initial user role',
            },
          },
        },
        PasswordResetRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
          },
        },
        PasswordResetConfirmRequest: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: {
              type: 'string',
              description: 'Password reset token',
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'New password',
            },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Current password',
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'New password',
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Valid refresh token',
            },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Session identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User identifier',
            },
            deviceInfo: {
              type: 'object',
              description: 'Device information',
            },
            ipAddress: {
              type: 'string',
              description: 'IP address',
            },
            userAgent: {
              type: 'string',
              description: 'User agent string',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether session is active',
            },
            lastActivity: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session expiration time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session creation time',
            },
          },
        },
        Permission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Permission identifier',
            },
            resource: {
              type: 'string',
              description: 'Resource name (e.g., employees, time_entries)',
            },
            action: {
              type: 'string',
              description: 'Action name (e.g., create, read, update, delete)',
            },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Audit log identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User who performed the action',
            },
            action: {
              type: 'string',
              description: 'Action performed',
            },
            resource: {
              type: 'string',
              description: 'Resource affected',
            },
            resourceId: {
              type: 'string',
              nullable: true,
              description: 'Resource identifier',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
            ipAddress: {
              type: 'string',
              description: 'IP address',
            },
            userAgent: {
              type: 'string',
              description: 'User agent',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Action timestamp',
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
            errors: {
              type: 'array',
              items: {
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
                  field: {
                    type: 'string',
                    description: 'Field that caused the error',
                  },
                },
              },
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
        name: 'Authentication',
        description: 'User authentication operations - login, logout, token refresh',
      },
      {
        name: 'Registration',
        description: 'User registration and account setup',
      },
      {
        name: 'Multi-Factor Authentication',
        description: 'MFA setup, verification, and management',
      },
      {
        name: 'Password Management',
        description: 'Password reset, change, and policy enforcement',
      },
      {
        name: 'Session Management',
        description: 'User session tracking and management',
      },
      {
        name: 'User Management',
        description: 'User profile and account management',
      },
      {
        name: 'Permissions',
        description: 'Permission and role management',
      },
      {
        name: 'Audit',
        description: 'Audit logging and security monitoring',
      },
      {
        name: 'Health',
        description: 'Service health and monitoring',
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
