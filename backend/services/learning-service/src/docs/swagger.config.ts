import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Learning & Development Service API',
      version: '2.0.0',
      description: 'Comprehensive learning management system with courses, progress tracking, and skill development',
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
        url: 'http://localhost:3005',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/learning',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/learning',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication service',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for external integrations',
        },
      },
      schemas: {
        Course: {
          type: 'object',
          required: ['title', 'description', 'category', 'duration'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique course identifier',
              example: 'c7f7f1e4-4b8a-4f8a-9b7a-6f7e4d3c2b1a',
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Course title',
              example: 'Advanced JavaScript Development',
            },
            description: {
              type: 'string',
              minLength: 1,
              maxLength: 2000,
              description: 'Detailed course description',
              example: 'Learn advanced JavaScript concepts including async/await, closures, and design patterns',
            },
            shortDescription: {
              type: 'string',
              maxLength: 500,
              description: 'Brief course summary',
              example: 'Master advanced JavaScript concepts and modern development patterns',
            },
            category: {
              type: 'string',
              enum: ['TECHNICAL', 'LEADERSHIP', 'COMMUNICATION', 'COMPLIANCE', 'SAFETY', 'SOFT_SKILLS', 'PRODUCT_KNOWLEDGE', 'SALES', 'MARKETING', 'FINANCE', 'HR', 'OPERATIONS', 'OTHER'],
              description: 'Course category',
              example: 'TECHNICAL',
            },
            difficulty: {
              type: 'string',
              enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
              description: 'Course difficulty level',
              example: 'INTERMEDIATE',
            },
            duration: {
              type: 'integer',
              minimum: 1,
              description: 'Course duration in minutes',
              example: 120,
            },
            estimatedHours: {
              type: 'number',
              minimum: 0,
              description: 'Estimated completion time in hours',
              example: 2.5,
            },
            language: {
              type: 'string',
              default: 'en',
              description: 'Course language code',
              example: 'en',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Course tags for filtering',
              example: ['javascript', 'programming', 'web-development'],
            },
            learningObjectives: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'What students will learn',
              example: ['Understand async/await patterns', 'Implement design patterns', 'Build scalable applications'],
            },
            prerequisites: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Required prior knowledge or courses',
              example: ['Basic JavaScript knowledge', 'Understanding of DOM manipulation'],
            },
            instructorId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee ID of internal instructor',
              example: 'e7f7f1e4-4b8a-4f8a-9b7a-6f7e4d3c2b1a',
            },
            instructorName: {
              type: 'string',
              description: 'Name of external instructor',
              example: 'John Smith',
            },
            thumbnailUrl: {
              type: 'string',
              format: 'uri',
              description: 'Course thumbnail image URL',
              example: 'https://cdn.hrms.com/courses/js-advanced-thumb.jpg',
            },
            trailerUrl: {
              type: 'string',
              format: 'uri',
              description: 'Course preview video URL',
              example: 'https://cdn.hrms.com/courses/js-advanced-trailer.mp4',
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Course price (null for free)',
              example: 99.99,
            },
            currency: {
              type: 'string',
              default: 'USD',
              description: 'Currency code',
              example: 'USD',
            },
            accessType: {
              type: 'string',
              enum: ['INTERNAL', 'PUBLIC', 'PARTNER', 'CUSTOMER'],
              default: 'INTERNAL',
              description: 'Who can access this course',
              example: 'INTERNAL',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', 'SUSPENDED'],
              default: 'DRAFT',
              description: 'Course status',
              example: 'PUBLISHED',
            },
            isPublished: {
              type: 'boolean',
              default: false,
              description: 'Whether course is published',
              example: true,
            },
            isFeatured: {
              type: 'boolean',
              default: false,
              description: 'Whether course is featured',
              example: false,
            },
            totalEnrollments: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of enrollments',
              example: 150,
            },
            averageRating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Average course rating',
              example: 4.5,
            },
            totalReviews: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of reviews',
              example: 25,
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When course was published',
              example: '2023-12-01T10:00:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When course was created',
              example: '2023-11-15T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When course was last updated',
              example: '2023-12-01T10:00:00Z',
            },
          },
        },
        Enrollment: {
          type: 'object',
          required: ['userId', 'courseId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique enrollment identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee ID',
            },
            courseId: {
              type: 'string',
              format: 'uuid',
              description: 'Course ID',
            },
            status: {
              type: 'string',
              enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED', 'EXPIRED', 'SUSPENDED'],
              default: 'ENROLLED',
              description: 'Enrollment status',
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Completion percentage',
              example: 65.5,
            },
            enrolledAt: {
              type: 'string',
              format: 'date-time',
              description: 'Enrollment date',
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When first lesson was accessed',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When course was completed',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Completion deadline',
            },
            isRequired: {
              type: 'boolean',
              default: false,
              description: 'Whether enrollment is mandatory',
            },
            finalScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Overall course score',
            },
          },
        },
        LearningPath: {
          type: 'object',
          required: ['title', 'description', 'estimatedHours'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique learning path identifier',
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Learning path title',
              example: 'Full Stack Development Path',
            },
            description: {
              type: 'string',
              minLength: 1,
              maxLength: 2000,
              description: 'Learning path description',
              example: 'Complete journey from frontend to backend development',
            },
            difficulty: {
              type: 'string',
              enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
              description: 'Path difficulty level',
            },
            estimatedHours: {
              type: 'number',
              minimum: 0,
              description: 'Estimated completion time',
            },
            category: {
              type: 'string',
              enum: ['TECHNICAL', 'LEADERSHIP', 'COMMUNICATION', 'COMPLIANCE', 'SAFETY', 'SOFT_SKILLS', 'PRODUCT_KNOWLEDGE', 'SALES', 'MARKETING', 'FINANCE', 'HR', 'OPERATIONS', 'OTHER'],
              description: 'Path category',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Path tags',
            },
            isPublished: {
              type: 'boolean',
              description: 'Whether path is published',
            },
            totalEnrollments: {
              type: 'integer',
              description: 'Total enrollments in this path',
            },
          },
        },
        Assessment: {
          type: 'object',
          required: ['title', 'type', 'questions'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Assessment identifier',
            },
            title: {
              type: 'string',
              description: 'Assessment title',
            },
            description: {
              type: 'string',
              description: 'Assessment description',
            },
            type: {
              type: 'string',
              enum: ['QUIZ', 'EXAM', 'ASSIGNMENT', 'PROJECT', 'PRACTICAL', 'SURVEY'],
              description: 'Assessment type',
            },
            timeLimit: {
              type: 'integer',
              description: 'Time limit in minutes',
            },
            attempts: {
              type: 'integer',
              default: 3,
              description: 'Maximum attempts allowed',
            },
            passingScore: {
              type: 'integer',
              default: 70,
              description: 'Required score to pass',
            },
            isRequired: {
              type: 'boolean',
              description: 'Whether assessment is required',
            },
          },
        },
        Certificate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Certificate identifier',
            },
            certificateNumber: {
              type: 'string',
              description: 'Unique certificate number',
            },
            title: {
              type: 'string',
              description: 'Certificate title',
            },
            completionDate: {
              type: 'string',
              format: 'date-time',
              description: 'When course was completed',
            },
            finalScore: {
              type: 'number',
              description: 'Final score achieved',
            },
            certificateUrl: {
              type: 'string',
              format: 'uri',
              description: 'Generated certificate file URL',
            },
            verificationCode: {
              type: 'string',
              description: 'Verification code for certificate',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Certificate expiration date',
            },
          },
        },
        APIResponse: {
          type: 'object',
          properties: {
            data: {
              description: 'Response data',
            },
            meta: {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
                filters: {
                  type: 'object',
                  description: 'Applied filters',
                },
              },
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  field: { type: 'string' },
                  details: { type: 'object' },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Error code',
              example: 'VALIDATION_ERROR',
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid input data',
            },
            field: {
              type: 'string',
              description: 'Field causing the error',
              example: 'email',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
      },
      responses: {
        Success: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/APIResponse',
              },
            },
          },
        },
        BadRequest: {
          description: 'Bad request - validation error',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/APIResponse' },
                  {
                    properties: {
                      data: { type: 'null' },
                      errors: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Error' },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - invalid or missing token',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/APIResponse' },
                  {
                    properties: {
                      data: { type: 'null' },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: 'UNAUTHORIZED' },
                            message: { type: 'string', example: 'Invalid or expired token' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/APIResponse' },
                  {
                    properties: {
                      data: { type: 'null' },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: 'FORBIDDEN' },
                            message: { type: 'string', example: 'Insufficient permissions' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/APIResponse' },
                  {
                    properties: {
                      data: { type: 'null' },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: 'NOT_FOUND' },
                            message: { type: 'string', example: 'Resource not found' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/APIResponse' },
                  {
                    properties: {
                      data: { type: 'null' },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: 'INTERNAL_ERROR' },
                            message: { type: 'string', example: 'An internal error occurred' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field and direction (e.g., "title:asc" or "createdAt:desc")',
          required: false,
          schema: {
            type: 'string',
            example: 'title:asc',
          },
        },
        FilterParam: {
          name: 'filter',
          in: 'query',
          description: 'Filter criteria as JSON object',
          required: false,
          schema: {
            type: 'string',
            example: '{"category":"TECHNICAL","difficulty":"INTERMEDIATE"}',
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
        name: 'Courses',
        description: 'Course management operations',
      },
      {
        name: 'Enrollments',
        description: 'Course enrollment operations',
      },
      {
        name: 'Progress',
        description: 'Learning progress tracking',
      },
      {
        name: 'Assessments',
        description: 'Assessment and quiz operations',
      },
      {
        name: 'Certificates',
        description: 'Certificate management',
      },
      {
        name: 'Learning Paths',
        description: 'Learning path operations',
      },
      {
        name: 'Skills',
        description: 'Skill tracking and management',
      },
      {
        name: 'Analytics',
        description: 'Learning analytics and reporting',
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
