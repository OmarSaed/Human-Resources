import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Recruitment & Onboarding Service API',
      version: '1.0.0',
      description: 'Comprehensive recruitment and onboarding management with ATS, candidate tracking, and automated workflows',
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
        url: 'http://localhost:3008',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/recruitment',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/recruitment',
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
        JobPosting: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Job posting identifier',
            },
            title: {
              type: 'string',
              description: 'Job title',
            },
            description: {
              type: 'string',
              description: 'Job description',
            },
            department: {
              type: 'string',
              description: 'Department',
            },
            location: {
              type: 'string',
              description: 'Job location',
            },
            type: {
              type: 'string',
              enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY'],
              description: 'Employment type',
            },
            level: {
              type: 'string',
              enum: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'EXECUTIVE'],
              description: 'Job level',
            },
            salaryRange: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                currency: { type: 'string' },
              },
              description: 'Salary range',
            },
            requirements: {
              type: 'array',
              items: { type: 'string' },
              description: 'Job requirements',
            },
            responsibilities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Job responsibilities',
            },
            skills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  level: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
                  required: { type: 'boolean' },
                },
              },
              description: 'Required skills',
            },
            benefits: {
              type: 'array',
              items: { type: 'string' },
              description: 'Job benefits',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'CANCELLED'],
              description: 'Job posting status',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
              description: 'Job priority',
            },
            openings: {
              type: 'integer',
              minimum: 1,
              description: 'Number of openings',
            },
            applicationDeadline: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Application deadline',
            },
            hiringManagerId: {
              type: 'string',
              format: 'uuid',
              description: 'Hiring manager identifier',
            },
            recruiterId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Assigned recruiter identifier',
            },
            workflowId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Recruitment workflow identifier',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Creator identifier',
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
        Candidate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Candidate identifier',
            },
            firstName: {
              type: 'string',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              description: 'Last name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Phone number',
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                zipCode: { type: 'string' },
              },
              description: 'Address information',
            },
            linkedInProfile: {
              type: 'string',
              nullable: true,
              description: 'LinkedIn profile URL',
            },
            portfolioUrl: {
              type: 'string',
              nullable: true,
              description: 'Portfolio URL',
            },
            resumeUrl: {
              type: 'string',
              nullable: true,
              description: 'Resume file URL',
            },
            coverLetterUrl: {
              type: 'string',
              nullable: true,
              description: 'Cover letter URL',
            },
            skills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  level: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
                  yearsOfExperience: { type: 'integer' },
                },
              },
              description: 'Candidate skills',
            },
            experience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  company: { type: 'string' },
                  position: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                  isCurrent: { type: 'boolean' },
                },
              },
              description: 'Work experience',
            },
            education: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  institution: { type: 'string' },
                  degree: { type: 'string' },
                  fieldOfStudy: { type: 'string' },
                  graduationYear: { type: 'integer' },
                  gpa: { type: 'number' },
                },
              },
              description: 'Education background',
            },
            certifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  issuingOrganization: { type: 'string' },
                  issueDate: { type: 'string', format: 'date' },
                  expiryDate: { type: 'string', format: 'date' },
                  credentialUrl: { type: 'string' },
                },
              },
              description: 'Certifications',
            },
            source: {
              type: 'string',
              enum: ['WEBSITE', 'REFERRAL', 'LINKEDIN', 'INDEED', 'GLASSDOOR', 'RECRUITER', 'OTHER'],
              description: 'Application source',
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Additional notes',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Candidate tags',
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
        Application: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Application identifier',
            },
            candidateId: {
              type: 'string',
              format: 'uuid',
              description: 'Candidate identifier',
            },
            jobPostingId: {
              type: 'string',
              format: 'uuid',
              description: 'Job posting identifier',
            },
            status: {
              type: 'string',
              enum: ['APPLIED', 'SCREENING', 'INTERVIEW', 'EVALUATION', 'REFERENCE_CHECK', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'],
              description: 'Application status',
            },
            stage: {
              type: 'string',
              description: 'Current recruitment stage',
            },
            score: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              nullable: true,
              description: 'Application score',
            },
            coverLetter: {
              type: 'string',
              nullable: true,
              description: 'Cover letter content',
            },
            questionsAnswers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  answer: { type: 'string' },
                },
              },
              description: 'Application questions and answers',
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                  type: { type: 'string' },
                },
              },
              description: 'Application attachments',
            },
            assignedRecruiterId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Assigned recruiter identifier',
            },
            lastActivityAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp',
            },
            appliedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Application timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Interview: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Interview identifier',
            },
            applicationId: {
              type: 'string',
              format: 'uuid',
              description: 'Application identifier',
            },
            type: {
              type: 'string',
              enum: ['PHONE', 'VIDEO', 'IN_PERSON', 'TECHNICAL', 'PANEL', 'BEHAVIORAL'],
              description: 'Interview type',
            },
            round: {
              type: 'integer',
              minimum: 1,
              description: 'Interview round number',
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled interview time',
            },
            duration: {
              type: 'integer',
              description: 'Interview duration in minutes',
            },
            location: {
              type: 'string',
              nullable: true,
              description: 'Interview location or meeting link',
            },
            interviewers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              description: 'Interview panel',
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'],
              description: 'Interview status',
            },
            feedback: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  interviewerId: { type: 'string', format: 'uuid' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  comments: { type: 'string' },
                  recommendation: { type: 'string', enum: ['HIRE', 'NO_HIRE', 'MAYBE'] },
                },
              },
              description: 'Interview feedback',
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Additional interview notes',
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
        Evaluation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Evaluation identifier',
            },
            applicationId: {
              type: 'string',
              format: 'uuid',
              description: 'Application identifier',
            },
            evaluatorId: {
              type: 'string',
              format: 'uuid',
              description: 'Evaluator identifier',
            },
            type: {
              type: 'string',
              enum: ['RESUME_REVIEW', 'TECHNICAL_ASSESSMENT', 'BEHAVIORAL_ASSESSMENT', 'FINAL_REVIEW'],
              description: 'Evaluation type',
            },
            criteria: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  weight: { type: 'number' },
                  score: { type: 'number' },
                  maxScore: { type: 'number' },
                  comments: { type: 'string' },
                },
              },
              description: 'Evaluation criteria and scores',
            },
            overallScore: {
              type: 'number',
              description: 'Overall evaluation score',
            },
            recommendation: {
              type: 'string',
              enum: ['PROCEED', 'REJECT', 'HOLD'],
              description: 'Evaluation recommendation',
            },
            comments: {
              type: 'string',
              nullable: true,
              description: 'Evaluation comments',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Completion timestamp',
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
        OnboardingTask: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Onboarding task identifier',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
              description: 'Employee identifier',
            },
            name: {
              type: 'string',
              description: 'Task name',
            },
            description: {
              type: 'string',
              description: 'Task description',
            },
            category: {
              type: 'string',
              enum: ['DOCUMENTATION', 'TRAINING', 'SETUP', 'MEETING', 'COMPLIANCE', 'OTHER'],
              description: 'Task category',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
              description: 'Task priority',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'OVERDUE'],
              description: 'Task status',
            },
            assignedTo: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Assigned user identifier',
            },
            dueDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Task due date',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Completion timestamp',
            },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                  required: { type: 'boolean' },
                },
              },
              description: 'Required documents',
            },
            checklist: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  completed: { type: 'boolean' },
                },
              },
              description: 'Task checklist',
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
        name: 'Job Postings',
        description: 'Job posting management',
      },
      {
        name: 'Candidates',
        description: 'Candidate profile management',
      },
      {
        name: 'Applications',
        description: 'Job application tracking',
      },
      {
        name: 'Interviews',
        description: 'Interview scheduling and management',
      },
      {
        name: 'Evaluations',
        description: 'Candidate evaluation and assessment',
      },
      {
        name: 'Onboarding',
        description: 'Employee onboarding task management',
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
