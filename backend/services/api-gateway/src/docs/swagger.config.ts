import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRMS API Gateway',
      version: '1.0.0',
      description: 'Central API Gateway for HRMS microservices ecosystem with intelligent routing, authentication, and monitoring',
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
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.hrms.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.hrms.com',
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
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded'],
              description: 'Overall system health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp',
            },
            version: {
              type: 'string',
              description: 'API Gateway version',
            },
            uptime: {
              type: 'string',
              description: 'System uptime',
            },
            services: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy', 'unknown'],
                  },
                  responseTime: {
                    type: 'number',
                    description: 'Service response time in ms',
                  },
                  lastCheck: {
                    type: 'string',
                    format: 'date-time',
                  },
                  endpoint: {
                    type: 'string',
                    description: 'Service health endpoint',
                  },
                },
              },
              description: 'Individual service health status',
            },
            dependencies: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                  },
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                  },
                },
                kafka: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                  },
                },
              },
              description: 'External dependency health status',
            },
          },
        },
        ServiceMetrics: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Service name',
            },
            metrics: {
              type: 'object',
              properties: {
                requestCount: {
                  type: 'integer',
                  description: 'Total requests processed',
                },
                errorCount: {
                  type: 'integer',
                  description: 'Total errors encountered',
                },
                averageResponseTime: {
                  type: 'number',
                  description: 'Average response time in ms',
                },
                p95ResponseTime: {
                  type: 'number',
                  description: '95th percentile response time',
                },
                p99ResponseTime: {
                  type: 'number',
                  description: '99th percentile response time',
                },
                uptime: {
                  type: 'number',
                  description: 'Service uptime percentage',
                },
                throughput: {
                  type: 'number',
                  description: 'Requests per second',
                },
                errorRate: {
                  type: 'number',
                  description: 'Error rate percentage',
                },
              },
            },
            circuitBreaker: {
              type: 'object',
              properties: {
                state: {
                  type: 'string',
                  enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
                  description: 'Circuit breaker state',
                },
                failureCount: {
                  type: 'integer',
                  description: 'Recent failure count',
                },
                successCount: {
                  type: 'integer',
                  description: 'Recent success count',
                },
                lastFailureTime: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                  description: 'Last failure timestamp',
                },
              },
            },
            loadBalancer: {
              type: 'object',
              properties: {
                strategy: {
                  type: 'string',
                  enum: ['ROUND_ROBIN', 'LEAST_CONNECTIONS', 'FASTEST_RESPONSE'],
                  description: 'Load balancing strategy',
                },
                instances: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      healthy: { type: 'boolean' },
                      responseTime: { type: 'number' },
                      activeConnections: { type: 'integer' },
                    },
                  },
                  description: 'Service instances',
                },
              },
            },
          },
        },
        RateLimitInfo: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              description: 'Rate limit threshold',
            },
            remaining: {
              type: 'integer',
              description: 'Remaining requests',
            },
            reset: {
              type: 'string',
              format: 'date-time',
              description: 'Rate limit reset time',
            },
            retryAfter: {
              type: 'integer',
              nullable: true,
              description: 'Seconds to wait before retrying',
            },
          },
        },
        ServiceDiscovery: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Service name',
                  },
                  version: {
                    type: 'string',
                    description: 'Service version',
                  },
                  instances: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        host: { type: 'string' },
                        port: { type: 'integer' },
                        protocol: { type: 'string' },
                        healthCheckUrl: { type: 'string' },
                        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                        registeredAt: { type: 'string', format: 'date-time' },
                        lastSeen: { type: 'string', format: 'date-time' },
                        metadata: { type: 'object' },
                      },
                    },
                    description: 'Service instances',
                  },
                  routes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        path: { type: 'string' },
                        methods: { type: 'array', items: { type: 'string' } },
                        auth: { type: 'boolean' },
                        rateLimit: { type: 'object' },
                      },
                    },
                    description: 'Service routes',
                  },
                },
              },
              description: 'Discovered services',
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
              description: 'Last discovery update',
            },
          },
        },
        GatewayConfig: {
          type: 'object',
          properties: {
            routing: {
              type: 'object',
              properties: {
                timeout: { type: 'integer', description: 'Request timeout in ms' },
                retries: { type: 'integer', description: 'Retry attempts' },
                loadBalancing: { type: 'string', description: 'Load balancing strategy' },
              },
            },
            security: {
              type: 'object',
              properties: {
                cors: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    origins: { type: 'array', items: { type: 'string' } },
                    methods: { type: 'array', items: { type: 'string' } },
                  },
                },
                rateLimit: {
                  type: 'object',
                  properties: {
                    global: { type: 'object' },
                    perUser: { type: 'object' },
                    perEndpoint: { type: 'object' },
                  },
                },
                authentication: {
                  type: 'object',
                  properties: {
                    jwt: { type: 'object' },
                    apiKey: { type: 'object' },
                  },
                },
              },
            },
            monitoring: {
              type: 'object',
              properties: {
                metrics: { type: 'boolean' },
                logging: { type: 'boolean' },
                tracing: { type: 'boolean' },
                healthChecks: { type: 'boolean' },
              },
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
                service: {
                  type: 'string',
                  description: 'Source service (if applicable)',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Error timestamp',
                },
                requestId: {
                  type: 'string',
                  description: 'Request correlation ID',
                },
              },
            },
          },
        },
        ProxyResponse: {
          type: 'object',
          description: 'Proxied response from downstream service',
          properties: {
            data: {
              type: 'object',
              description: 'Response data from downstream service',
            },
            headers: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Response headers',
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
            },
            responseTime: {
              type: 'number',
              description: 'Response time in milliseconds',
            },
            service: {
              type: 'string',
              description: 'Source service name',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        apiKey: [],
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Gateway and service health monitoring',
      },
      {
        name: 'Metrics',
        description: 'Performance metrics and monitoring',
      },
      {
        name: 'Service Discovery',
        description: 'Service registration and discovery',
      },
      {
        name: 'Configuration',
        description: 'Gateway configuration management',
      },
      {
        name: 'Authentication',
        description: 'Authentication and authorization proxy routes',
      },
      {
        name: 'Employee Management',
        description: 'Employee service proxy routes',
      },
      {
        name: 'Time & Attendance',
        description: 'Time and attendance service proxy routes',
      },
      {
        name: 'Performance',
        description: 'Performance management service proxy routes',
      },
      {
        name: 'Learning',
        description: 'Learning and development service proxy routes',
      },
      {
        name: 'Documents',
        description: 'Document management service proxy routes',
      },
      {
        name: 'Notifications',
        description: 'Notification service proxy routes',
      },
      {
        name: 'Analytics',
        description: 'Analytics service proxy routes',
      },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Get gateway and service health status',
          description: 'Returns comprehensive health information for the gateway and all connected services',
          responses: {
            '200': {
              description: 'Health status retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthStatus',
                  },
                },
              },
            },
            '503': {
              description: 'Service unavailable',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/metrics': {
        get: {
          tags: ['Metrics'],
          summary: 'Get gateway metrics',
          description: 'Returns performance metrics for all services',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Metrics retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ServiceMetrics',
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
            },
            '403': {
              description: 'Forbidden - insufficient permissions',
            },
          },
        },
      },
      '/services': {
        get: {
          tags: ['Service Discovery'],
          summary: 'Get discovered services',
          description: 'Returns information about all discovered services and their instances',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Service discovery information',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ServiceDiscovery',
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
            },
          },
        },
      },
      '/config': {
        get: {
          tags: ['Configuration'],
          summary: 'Get gateway configuration',
          description: 'Returns current gateway configuration',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Configuration retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/GatewayConfig',
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
            },
            '403': {
              description: 'Forbidden - admin access required',
            },
          },
        },
      },
      '/api/v1/auth/{proxy+}': {
        'x-amazon-apigateway-any-method': {
          tags: ['Authentication'],
          summary: 'Authentication service proxy',
          description: 'Proxies requests to the authentication service',
          parameters: [
            {
              name: 'proxy+',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Authentication service path',
            },
          ],
          responses: {
            '200': {
              description: 'Proxied response from authentication service',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ProxyResponse',
                  },
                },
              },
            },
            '503': {
              description: 'Authentication service unavailable',
            },
          },
        },
      },
      '/api/v1/employees/{proxy+}': {
        'x-amazon-apigateway-any-method': {
          tags: ['Employee Management'],
          summary: 'Employee service proxy',
          description: 'Proxies requests to the employee management service',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proxy+',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Employee service path',
            },
          ],
          responses: {
            '200': {
              description: 'Proxied response from employee service',
            },
            '401': {
              description: 'Unauthorized',
            },
            '503': {
              description: 'Employee service unavailable',
            },
          },
        },
      },
      '/api/v1/time-attendance/{proxy+}': {
        'x-amazon-apigateway-any-method': {
          tags: ['Time & Attendance'],
          summary: 'Time & attendance service proxy',
          description: 'Proxies requests to the time and attendance service',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proxy+',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Time & attendance service path',
            },
          ],
          responses: {
            '200': {
              description: 'Proxied response from time & attendance service',
            },
            '401': {
              description: 'Unauthorized',
            },
            '503': {
              description: 'Time & attendance service unavailable',
            },
          },
        },
      },
      '/api/v1/performance/{proxy+}': {
        'x-amazon-apigateway-any-method': {
          tags: ['Performance'],
          summary: 'Performance service proxy',
          description: 'Proxies requests to the performance management service',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proxy+',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Performance service path',
            },
          ],
          responses: {
            '200': {
              description: 'Proxied response from performance service',
            },
            '401': {
              description: 'Unauthorized',
            },
            '503': {
              description: 'Performance service unavailable',
            },
          },
        },
      },
      '/api/v1/learning/{proxy+}': {
        'x-amazon-apigateway-any-method': {
          tags: ['Learning'],
          summary: 'Learning service proxy',
          description: 'Proxies requests to the learning and development service',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proxy+',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Learning service path',
            },
          ],
          responses: {
            '200': {
              description: 'Proxied response from learning service',
            },
            '401': {
              description: 'Unauthorized',
            },
            '503': {
              description: 'Learning service unavailable',
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
    './src/services/*.ts',
    './src/docs/paths/*.yaml',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
