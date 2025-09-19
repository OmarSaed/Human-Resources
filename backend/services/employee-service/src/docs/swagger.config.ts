import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS Employee Management Service API',
      version: '1.0.0',
      description: 'Comprehensive employee lifecycle management with organizational structure and analytics',
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
        url: 'http://localhost:3002',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com/employees',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com/employees',
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
        Employee: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique employee identifier',
            },
            employeeNumber: {
              type: 'string',
              description: 'Unique employee number',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated user account ID',
            },
            firstName: {
              type: 'string',
              description: 'Employee first name',
            },
            lastName: {
              type: 'string',
              description: 'Employee last name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Employee email address',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Employee phone number',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Employee date of birth',
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
              nullable: true,
              description: 'Employee gender',
            },
            nationality: {
              type: 'string',
              nullable: true,
              description: 'Employee nationality',
            },
            maritalStatus: {
              type: 'string',
              enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
              nullable: true,
              description: 'Employee marital status',
            },
            address: {
              type: 'object',
              nullable: true,
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                zipCode: { type: 'string' },
              },
              description: 'Employee address',
            },
            emergencyContact: {
              type: 'object',
              nullable: true,
              properties: {
                name: { type: 'string' },
                relationship: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
              },
              description: 'Emergency contact information',
            },
            departmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Department identifier',
            },
            positionId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Position identifier',
            },
            managerId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Manager employee identifier',
            },
            hireDate: {
              type: 'string',
              format: 'date',
              description: 'Employee hire date',
            },
            employmentType: {
              type: 'string',
              enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'],
              description: 'Employment type',
            },
            employmentStatus: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'],
              description: 'Employment status',
            },
            salary: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Employee salary',
            },
            currency: {
              type: 'string',
              default: 'USD',
              description: 'Salary currency',
            },
            workLocation: {
              type: 'string',
              enum: ['OFFICE', 'REMOTE', 'HYBRID'],
              default: 'OFFICE',
              description: 'Work location type',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee skills and competencies',
            },
            certifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  issuer: { type: 'string' },
                  issueDate: { type: 'string', format: 'date' },
                  expiryDate: { type: 'string', format: 'date' },
                },
              },
              description: 'Employee certifications',
            },
            education: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  degree: { type: 'string' },
                  institution: { type: 'string' },
                  fieldOfStudy: { type: 'string' },
                  graduationYear: { type: 'integer' },
                },
              },
              description: 'Educational background',
            },
            workExperience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  company: { type: 'string' },
                  position: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                },
              },
              description: 'Previous work experience',
            },
            profilePicture: {
              type: 'string',
              nullable: true,
              description: 'Profile picture URL',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether employee is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        EmployeeCreateRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'hireDate', 'employmentType'],
          properties: {
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Employee first name',
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Employee last name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Employee email address',
            },
            phone: {
              type: 'string',
              description: 'Employee phone number',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Employee date of birth',
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
              description: 'Employee gender',
            },
            nationality: {
              type: 'string',
              description: 'Employee nationality',
            },
            maritalStatus: {
              type: 'string',
              enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
              description: 'Employee marital status',
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
              description: 'Employee address',
            },
            emergencyContact: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                relationship: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
              },
              description: 'Emergency contact information',
            },
            departmentId: {
              type: 'string',
              format: 'uuid',
              description: 'Department identifier',
            },
            positionId: {
              type: 'string',
              format: 'uuid',
              description: 'Position identifier',
            },
            managerId: {
              type: 'string',
              format: 'uuid',
              description: 'Manager employee identifier',
            },
            hireDate: {
              type: 'string',
              format: 'date',
              description: 'Employee hire date',
            },
            employmentType: {
              type: 'string',
              enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'],
              description: 'Employment type',
            },
            salary: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Employee salary',
            },
            currency: {
              type: 'string',
              default: 'USD',
              description: 'Salary currency',
            },
            workLocation: {
              type: 'string',
              enum: ['OFFICE', 'REMOTE', 'HYBRID'],
              default: 'OFFICE',
              description: 'Work location type',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee skills and competencies',
            },
          },
        },
        Department: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Department identifier',
            },
            name: {
              type: 'string',
              description: 'Department name',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Department description',
            },
            parentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Parent department identifier',
            },
            managerId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Department manager employee ID',
            },
            budget: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Department budget',
            },
            costCenter: {
              type: 'string',
              nullable: true,
              description: 'Cost center code',
            },
            location: {
              type: 'string',
              nullable: true,
              description: 'Department location',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether department is active',
            },
            employeeCount: {
              type: 'integer',
              description: 'Number of employees in department',
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
        Position: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Position identifier',
            },
            title: {
              type: 'string',
              description: 'Position title',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Position description',
            },
            departmentId: {
              type: 'string',
              format: 'uuid',
              description: 'Department identifier',
            },
            level: {
              type: 'string',
              enum: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL'],
              description: 'Position level',
            },
            minSalary: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Minimum salary for position',
            },
            maxSalary: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Maximum salary for position',
            },
            currency: {
              type: 'string',
              default: 'USD',
              description: 'Salary currency',
            },
            requirements: {
              type: 'array',
              items: { type: 'string' },
              description: 'Position requirements',
            },
            responsibilities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Position responsibilities',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: 'Required skills',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether position is active',
            },
            openPositions: {
              type: 'integer',
              description: 'Number of open positions',
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
        EmployeeAnalytics: {
          type: 'object',
          properties: {
            totalEmployees: {
              type: 'integer',
              description: 'Total number of employees',
            },
            activeEmployees: {
              type: 'integer',
              description: 'Number of active employees',
            },
            newHiresThisMonth: {
              type: 'integer',
              description: 'New hires in current month',
            },
            terminationsThisMonth: {
              type: 'integer',
              description: 'Terminations in current month',
            },
            turnoverRate: {
              type: 'number',
              format: 'decimal',
              description: 'Annual turnover rate percentage',
            },
            averageTenure: {
              type: 'number',
              format: 'decimal',
              description: 'Average employee tenure in years',
            },
            departmentBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  departmentName: { type: 'string' },
                  employeeCount: { type: 'integer' },
                  percentage: { type: 'number' },
                },
              },
              description: 'Employee distribution by department',
            },
            employmentTypeBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  count: { type: 'integer' },
                  percentage: { type: 'number' },
                },
              },
              description: 'Employee distribution by employment type',
            },
            genderDistribution: {
              type: 'object',
              properties: {
                male: { type: 'integer' },
                female: { type: 'integer' },
                other: { type: 'integer' },
                notSpecified: { type: 'integer' },
              },
              description: 'Gender distribution',
            },
            ageDistribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ageRange: { type: 'string' },
                  count: { type: 'integer' },
                  percentage: { type: 'number' },
                },
              },
              description: 'Age distribution by ranges',
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
        name: 'Employees',
        description: 'Employee lifecycle management operations',
      },
      {
        name: 'Departments',
        description: 'Department management and organizational structure',
      },
      {
        name: 'Positions',
        description: 'Position and job title management',
      },
      {
        name: 'Analytics',
        description: 'Employee analytics and reporting',
      },
      {
        name: 'Search',
        description: 'Employee search and filtering operations',
      },
      {
        name: 'Organizational Chart',
        description: 'Organizational hierarchy and reporting structure',
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
