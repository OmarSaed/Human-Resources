import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Performance Management Service API',
      version: '1.0.0',
      description: 'Comprehensive performance management with reviews, goals, development plans, and competency assessments',
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
        url: 'http://localhost:3004',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/performance',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/performance',
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
        PerformanceReview: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Performance review identifier',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee being reviewed',
            },
            reviewerId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee conducting the review',
            },
            reviewType: {
              type: 'string',
              enum: ['ANNUAL', 'QUARTERLY', 'PROBATIONARY', 'PROJECT_BASED', 'CONTINUOUS'],
              description: 'Type of performance review',
            },
            reviewPeriod: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
              },
              description: 'Review period',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED'],
              description: 'Review status',
            },
            overallRating: {
              type: 'number',
              format: 'decimal',
              minimum: 1,
              maximum: 5,
              nullable: true,
              description: 'Overall performance rating (1-5)',
            },
            summary: {
              type: 'string',
              nullable: true,
              description: 'Review summary',
            },
            strengths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee strengths',
            },
            areasForImprovement: {
              type: 'array',
              items: { type: 'string' },
              description: 'Areas needing improvement',
            },
            goals: {
              type: 'array',
              items: { $ref: '#/components/schemas/Goal' },
              description: 'Associated goals',
            },
            competencies: {
              type: 'array',
              items: { $ref: '#/components/schemas/CompetencyAssessment' },
              description: 'Competency assessments',
            },
            feedback: {
              type: 'array',
              items: { $ref: '#/components/schemas/Feedback' },
              description: 'Feedback entries',
            },
            developmentPlan: {
              $ref: '#/components/schemas/DevelopmentPlan',
              description: 'Associated development plan',
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Review due date',
            },
            submittedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Submission timestamp',
            },
            approvedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Approval timestamp',
            },
            approvedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Approver identifier',
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
        Goal: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Goal identifier',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            title: {
              type: 'string',
              description: 'Goal title',
            },
            description: {
              type: 'string',
              description: 'Goal description',
            },
            category: {
              type: 'string',
              enum: ['PERFORMANCE', 'DEVELOPMENT', 'BEHAVIORAL', 'STRATEGIC', 'OPERATIONAL'],
              description: 'Goal category',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'Goal priority',
            },
            type: {
              type: 'string',
              enum: ['OKR', 'KPI', 'SMART', 'PERSONAL'],
              description: 'Goal type',
            },
            targetValue: {
              type: 'string',
              nullable: true,
              description: 'Target value or metric',
            },
            currentValue: {
              type: 'string',
              nullable: true,
              description: 'Current progress value',
            },
            progress: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Progress percentage',
            },
            status: {
              type: 'string',
              enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'],
              description: 'Goal status',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Goal start date',
            },
            targetDate: {
              type: 'string',
              format: 'date',
              description: 'Goal target completion date',
            },
            completedDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Goal completion date',
            },
            milestones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  targetDate: { type: 'string', format: 'date' },
                  completed: { type: 'boolean' },
                  completedDate: { type: 'string', format: 'date' },
                },
              },
              description: 'Goal milestones',
            },
            resources: {
              type: 'array',
              items: { type: 'string' },
              description: 'Required resources',
            },
            successCriteria: {
              type: 'array',
              items: { type: 'string' },
              description: 'Success criteria',
            },
            weight: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              maximum: 100,
              description: 'Goal weight in overall performance',
            },
            isVisible: {
              type: 'boolean',
              description: 'Whether goal is visible to employee',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Goal creator identifier',
            },
            assignedBy: {
              type: 'string',
              format: 'uuid',
              description: 'Goal assigner identifier',
            },
          },
        },
        CompetencyAssessment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Assessment identifier',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            competencyFrameworkId: {
              type: 'string',
              format: 'uuid',
              description: 'Competency framework identifier',
            },
            assessorId: {
              type: 'string',
              format: 'uuid',
              description: 'Assessor identifier',
            },
            competencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  competencyId: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  currentLevel: { type: 'integer', minimum: 1, maximum: 5 },
                  targetLevel: { type: 'integer', minimum: 1, maximum: 5 },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  evidence: { type: 'string' },
                  developmentActions: { type: 'array', items: { type: 'string' } },
                },
              },
              description: 'Individual competency assessments',
            },
            overallScore: {
              type: 'number',
              format: 'decimal',
              description: 'Overall competency score',
            },
            assessmentDate: {
              type: 'string',
              format: 'date',
              description: 'Assessment date',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'COMPLETED', 'APPROVED'],
              description: 'Assessment status',
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Assessment notes',
            },
            developmentRecommendations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Development recommendations',
            },
          },
        },
        DevelopmentPlan: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Development plan identifier',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            title: {
              type: 'string',
              description: 'Development plan title',
            },
            description: {
              type: 'string',
              description: 'Development plan description',
            },
            objectives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  targetDate: { type: 'string', format: 'date' },
                  status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] },
                  progress: { type: 'integer', minimum: 0, maximum: 100 },
                },
              },
              description: 'Development objectives',
            },
            learningActivities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['COURSE', 'WORKSHOP', 'MENTORING', 'ON_THE_JOB', 'CERTIFICATION'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  provider: { type: 'string' },
                  duration: { type: 'string' },
                  cost: { type: 'number' },
                  targetDate: { type: 'string', format: 'date' },
                  status: { type: 'string', enum: ['PLANNED', 'ENROLLED', 'IN_PROGRESS', 'COMPLETED'] },
                },
              },
              description: 'Learning activities',
            },
            skillGaps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill: { type: 'string' },
                  currentLevel: { type: 'integer', minimum: 1, maximum: 5 },
                  targetLevel: { type: 'integer', minimum: 1, maximum: 5 },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                },
              },
              description: 'Identified skill gaps',
            },
            mentorId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Assigned mentor identifier',
            },
            budget: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Development budget',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Plan start date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Plan end date',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'],
              description: 'Plan status',
            },
            progress: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Overall progress percentage',
            },
          },
        },
        Feedback: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Feedback identifier',
            },
            providerId: {
              type: 'string',
              format: 'uuid',
              description: 'Feedback provider identifier',
            },
            recipientId: {
              type: 'string',
              format: 'uuid',
              description: 'Feedback recipient identifier',
            },
            type: {
              type: 'string',
              enum: ['PERFORMANCE', 'PEER', 'UPWARD', 'SELF', 'CUSTOMER', 'CONTINUOUS'],
              description: 'Feedback type',
            },
            category: {
              type: 'string',
              enum: ['POSITIVE', 'CONSTRUCTIVE', 'SUGGESTION', 'APPRECIATION'],
              description: 'Feedback category',
            },
            content: {
              type: 'string',
              description: 'Feedback content',
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              nullable: true,
              description: 'Feedback rating',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: 'Skills mentioned in feedback',
            },
            isAnonymous: {
              type: 'boolean',
              description: 'Whether feedback is anonymous',
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether feedback is public',
            },
            requestId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Associated feedback request ID',
            },
            reviewId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Associated review ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        PerformanceMetrics: {
          type: 'object',
          properties: {
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            period: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
              },
              description: 'Metrics period',
            },
            overallPerformance: {
              type: 'number',
              format: 'decimal',
              description: 'Overall performance score',
            },
            goalCompletion: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                completed: { type: 'integer' },
                completionRate: { type: 'number' },
              },
              description: 'Goal completion statistics',
            },
            competencyScores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  competency: { type: 'string' },
                  score: { type: 'number' },
                  improvement: { type: 'number' },
                },
              },
              description: 'Competency scores',
            },
            feedbackSummary: {
              type: 'object',
              properties: {
                totalReceived: { type: 'integer' },
                averageRating: { type: 'number' },
                positiveCount: { type: 'integer' },
                constructiveCount: { type: 'integer' },
              },
              description: 'Feedback summary',
            },
            trends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric: { type: 'string' },
                  trend: { type: 'string', enum: ['IMPROVING', 'STABLE', 'DECLINING'] },
                  changePercentage: { type: 'number' },
                },
              },
              description: 'Performance trends',
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
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Performance Reviews',
        description: 'Performance review lifecycle management',
      },
      {
        name: 'Goals',
        description: 'Goal setting, tracking, and management',
      },
      {
        name: 'Competencies',
        description: 'Competency assessment and skill tracking',
      },
      {
        name: 'Development Plans',
        description: 'Employee development planning and tracking',
      },
      {
        name: 'Feedback',
        description: 'Continuous feedback and peer reviews',
      },
      {
        name: 'Analytics',
        description: 'Performance analytics and reporting',
      },
      {
        name: 'Calibration',
        description: 'Performance calibration and benchmarking',
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
