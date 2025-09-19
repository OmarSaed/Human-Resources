import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';
import { AppConfig, DatabaseConfig, KafkaConfig, RedisConfig, StorageConfig } from '../types';

// Load environment variables from shared directory root
let envPath: string;
let result: any;

// Look for .env file in shared directory root (where this config is located)
const sharedEnvPath = path.resolve(__dirname, '../../.env');
const fallbackEnvPath = path.resolve(process.cwd(), '.env');

if (require('fs').existsSync(sharedEnvPath)) {
  envPath = sharedEnvPath;
  result = dotenv.config({ path: envPath });
} else if (require('fs').existsSync(fallbackEnvPath)) {
  envPath = fallbackEnvPath;
  result = dotenv.config({ path: envPath });
} else {
  // Fallback to default dotenv behavior
  envPath = '.env';
  result = dotenv.config();
}

console.log('🔍 Loading .env from:', envPath);
console.log('📁 Current working directory:', process.cwd());
console.log('✅ Dotenv result:', result);
console.log('🔑 KAFKA_BROKERS after load:', process.env.KAFKA_BROKERS);

// Validation schema for environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  
  PORT: Joi.number().default(3000),
  
  // JWT Configuration
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  
  // Database Configuration
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  
  // Kafka Configuration
  KAFKA_CLIENT_ID: Joi.string().default('hrms-service'),
  KAFKA_BROKERS: Joi.string().required(),
  KAFKA_GROUP_ID: Joi.string().required(),
  KAFKA_SSL: Joi.boolean().default(false),
  KAFKA_SASL_MECHANISM: Joi.string().valid('plain', 'scram-sha-256', 'scram-sha-512').optional(),
  KAFKA_SASL_USERNAME: Joi.string().when('KAFKA_SASL_MECHANISM', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  KAFKA_SASL_PASSWORD: Joi.string().when('KAFKA_SASL_MECHANISM', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
    
  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // File Upload
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
  UPLOAD_DIR: Joi.string().default('./uploads'),
  
  // Storage Configuration
  STORAGE_TYPE: Joi.string().valid('local', 's3', 'minio').default('local'),
  
  // AWS S3 Configuration
  AWS_REGION: Joi.string().when('STORAGE_TYPE', {
    is: Joi.valid('s3', 'minio'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AWS_ACCESS_KEY_ID: Joi.string().when('STORAGE_TYPE', {
    is: Joi.valid('s3', 'minio'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_TYPE', {
    is: Joi.valid('s3', 'minio'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AWS_S3_BUCKET: Joi.string().when('STORAGE_TYPE', {
    is: Joi.valid('s3', 'minio'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AWS_S3_ENDPOINT: Joi.string().optional(), // For MinIO or custom S3 endpoints
}).unknown();

// Validate environment variables - only do this when explicitly called
let envVars: any;

function validateAndLoadEnv() {
  if (envVars) return envVars; // Already validated
  
  const { error, value } = envSchema.validate(process.env);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  envVars = value;
  return envVars;
}

// Initialize envVars for immediate use, but don't fail on import
try {
  envVars = envSchema.validate(process.env).value || process.env;
} catch {
  // Fallback to process.env if validation fails during import
  envVars = process.env;
}

// Create database configuration
const databaseConfig: DatabaseConfig = {
  host: envVars.DB_HOST,
  port: envVars.DB_PORT,
  database: envVars.DB_NAME,
  username: envVars.DB_USER,
  password: envVars.DB_PASSWORD,
  ssl: envVars.DB_SSL,
};

// Create Kafka configuration
const kafkaConfig: KafkaConfig = {
  clientId: envVars.KAFKA_CLIENT_ID,
  brokers: envVars.KAFKA_BROKERS.split(',').map((broker: string) => broker.trim()),
  groupId: envVars.KAFKA_GROUP_ID,
  ssl: envVars.KAFKA_SSL,
  ...(envVars.KAFKA_SASL_MECHANISM && {
    sasl: {
      mechanism: envVars.KAFKA_SASL_MECHANISM,
      username: envVars.KAFKA_SASL_USERNAME,
      password: envVars.KAFKA_SASL_PASSWORD,
    },
  }),
};

// Create Redis configuration
const redisConfig: RedisConfig = {
  host: envVars.REDIS_HOST,
  port: envVars.REDIS_PORT,
  password: envVars.REDIS_PASSWORD,
  db: envVars.REDIS_DB,
};

// Create Storage configuration
const storageConfig: StorageConfig = {
  type: envVars.STORAGE_TYPE,
  local: {
    uploadPath: envVars.UPLOAD_DIR,
    maxFileSize: envVars.MAX_FILE_SIZE,
  },
  ...(envVars.STORAGE_TYPE === 's3' || envVars.STORAGE_TYPE === 'minio') && {
    s3: {
      bucket: envVars.AWS_S3_BUCKET,
      region: envVars.AWS_REGION,
      accessKeyId: envVars.AWS_ACCESS_KEY_ID,
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
      endpoint: envVars.AWS_S3_ENDPOINT,
    }
  }
};

// Main application configuration
export const config: AppConfig = {
  port: envVars.PORT,
  env: envVars.NODE_ENV,
  host: process.env.HOST || '0.0.0.0',
  serviceName: process.env.SERVICE_NAME || 'hrms-shared',
  version: process.env.SERVICE_VERSION || '1.0.0',
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  database: databaseConfig,
  kafka: kafkaConfig,
  redis: redisConfig,
};

// Additional configuration values
export const additionalConfig = {
  cors: {
    origin: envVars.CORS_ORIGIN,
    credentials: true,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW,
    max: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    uploadDir: envVars.UPLOAD_DIR,
  },
  storage: {
    type: envVars.STORAGE_TYPE,
    local: {
      uploadPath: envVars.UPLOAD_DIR,
      maxFileSize: envVars.MAX_FILE_SIZE,
    },
    s3: envVars.STORAGE_TYPE === 's3' || envVars.STORAGE_TYPE === 'minio' ? {
      bucket: envVars.AWS_S3_BUCKET,
      region: envVars.AWS_REGION,
      accessKeyId: envVars.AWS_ACCESS_KEY_ID,
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
      endpoint: envVars.AWS_S3_ENDPOINT,
    } : undefined,
  },
  aws: {
    region: envVars.AWS_REGION,
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    s3Bucket: envVars.AWS_S3_BUCKET,
    s3Endpoint: envVars.AWS_S3_ENDPOINT,
  },
  logging: {
    level: envVars.LOG_LEVEL,
  },
};

// Export storage configuration
export { storageConfig };

// Helper functions
export const isDevelopment = (): boolean => config.env === 'development';
export const isProduction = (): boolean => config.env === 'production';
export const isTest = (): boolean => process.env.NODE_ENV === 'test';

// Get service-specific configuration with comprehensive settings
export const getServiceConfig = (serviceName: string) => {
  const baseConfig = {
    ...config,
    kafka: {
      ...config.kafka,
      clientId: `${serviceName}-${config.kafka.clientId}`,
      groupId: `${serviceName}-${config.kafka.groupId}`,
    },
  };

  // Service-specific configurations
  const serviceSpecificConfigs: any = {
    'auth-service': {
      ...baseConfig,
      port: parseInt(process.env.AUTH_SERVICE_PORT || '3001'),
      jwt: {
        ...baseConfig.jwt,
        accessTokenSecret: process.env.JWT_ACCESS_SECRET || baseConfig.jwt.secret,
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET || baseConfig.jwt.secret + '-refresh',
        issuer: process.env.JWT_ISSUER || 'hrms-system',
        audience: process.env.JWT_AUDIENCE || 'hrms-users',
      },
      session: {
        secret: process.env.SESSION_SECRET || 'hrms-session-secret',
        ttl: parseInt(process.env.SESSION_TTL || '3600'),
        maxSessions: 5,
      },
      mfa: {
        appName: 'HRMS',
        required: process.env.MFA_REQUIRED === 'true',
      },
      email: {
        from: process.env.EMAIL_FROM || 'noreply@hrms.com',
        smtp: {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
        },
      },
    },
    'employee-service': {
      ...baseConfig,
      port: parseInt(process.env.EMPLOYEE_SERVICE_PORT || '3002'),
      redis: { ...baseConfig.redis, db: 1 },
      fileUpload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
        uploadPath: process.env.UPLOAD_DIR || './uploads',
      },
    },
    'time-attendance-service': {
      ...baseConfig,
      port: parseInt(process.env.TIME_ATTENDANCE_SERVICE_PORT || '3003'),
      redis: { ...baseConfig.redis, db: 3 },
      timeTracking: {
        enableGpsTracking: process.env.ENABLE_GPS_TRACKING === 'true',
        enableBiometric: process.env.ENABLE_BIOMETRIC === 'true',
        maxDailyHours: parseFloat(process.env.MAX_DAILY_HOURS || '12'),
        overtimeThreshold: parseFloat(process.env.OVERTIME_THRESHOLD || '8'),
      },
      attendance: {
        defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
        workWeekStart: process.env.WORK_WEEK_START || 'monday',
      },
    },
    'api-gateway': {
      ...baseConfig,
      port: parseInt(process.env.API_GATEWAY_PORT || '8000'),
      services: {
        'auth': { url: `http://auth-service:${process.env.AUTH_SERVICE_PORT || '3001'}`, timeout: 5000, healthPath: '/health' },
        'employee': { url: `http://employee-service:${process.env.EMPLOYEE_SERVICE_PORT || '3002'}`, timeout: 5000, healthPath: '/health' },
        'time-attendance': { url: `http://time-attendance-service:${process.env.TIME_ATTENDANCE_SERVICE_PORT || '3003'}`, timeout: 5000, healthPath: '/health' },
        'performance': { url: `http://performance-service:${process.env.PERFORMANCE_SERVICE_PORT || '3004'}`, timeout: 5000, healthPath: '/health' },
        'learning': { url: `http://learning-service:${process.env.LEARNING_SERVICE_PORT || '3005'}`, timeout: 5000, healthPath: '/health' },
        'recruitment': { url: `http://recruitment-service:${process.env.RECRUITMENT_SERVICE_PORT || '3006'}`, timeout: 5000, healthPath: '/health' },
        'document': { url: `http://document-service:${process.env.DOCUMENT_SERVICE_PORT || '3007'}`, timeout: 5000, healthPath: '/health' },
        'notification': { url: `http://notification-service:${process.env.NOTIFICATION_SERVICE_PORT || '3008'}`, timeout: 5000, healthPath: '/health' },
      },
      loadBalancing: {
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
        maxRetries: parseInt(process.env.MAX_HEALTH_CHECK_RETRIES || '3'),
        timeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'), // 5 seconds
        strategy: process.env.LOAD_BALANCING_STRATEGY || 'round-robin', // round-robin, least-connections, random
      },
      rateLimiting: {
        global: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        },
        auth: {
          windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '900000'),
          maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
        },
        perUser: {
          windowMs: parseInt(process.env.RATE_LIMIT_USER_WINDOW || '900000'), // 15 minutes
          maxRequests: parseInt(process.env.RATE_LIMIT_USER_MAX || '50'),
        },
        apiKey: {
          windowMs: parseInt(process.env.RATE_LIMIT_APIKEY_WINDOW || '3600000'), // 1 hour
          maxRequests: parseInt(process.env.RATE_LIMIT_APIKEY_MAX || '1000'),
        },
      },
      security: {
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
        corsCredentials: process.env.CORS_CREDENTIALS !== 'false',
        jwtSecret: envVars.JWT_SECRET,
        requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '10mb',
        jwtVerifyOptions: {
          issuer: envVars.JWT_ISSUER,
          audience: envVars.JWT_AUDIENCE,
        },
      },
      proxy: {
        timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
        retries: parseInt(process.env.PROXY_RETRIES || '3'),
        changeOrigin: process.env.PROXY_CHANGE_ORIGIN !== 'false',
        followRedirects: process.env.PROXY_FOLLOW_REDIRECTS !== 'false',
      },
      circuitBreaker: {
        enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
        threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '30000'),
        resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'),
      },
      monitoring: {
        enableMetrics: process.env.ENABLE_METRICS !== 'false',
        enableTracing: process.env.ENABLE_TRACING !== 'false',
        metricsInterval: parseInt(process.env.METRICS_INTERVAL || '30000'),
      },
    },
    'performance-service': {
      ...baseConfig,
      port: parseInt(process.env.PERFORMANCE_SERVICE_PORT || '3004'),
      redis: { ...baseConfig.redis, db: 4 },
    },
    'learning-service': {
      ...baseConfig,
      port: parseInt(process.env.LEARNING_SERVICE_PORT || '3005'),
      redis: { ...baseConfig.redis, db: 5 },
    },
    'recruitment-service': {
      ...baseConfig,
      port: parseInt(process.env.RECRUITMENT_SERVICE_PORT || '3006'),
      redis: { ...baseConfig.redis, db: 6 },
    },
    'document-service': {
      ...baseConfig,
      port: parseInt(process.env.DOCUMENT_SERVICE_PORT || '3007'),
      redis: { ...baseConfig.redis, db: 7 },
      storage: {
        type: envVars.STORAGE_TYPE,
        local: {
          uploadPath: envVars.UPLOAD_DIR,
          maxFileSize: envVars.MAX_FILE_SIZE,
        },
        s3: envVars.STORAGE_TYPE === 's3' || envVars.STORAGE_TYPE === 'minio' ? {
          bucket: envVars.AWS_S3_BUCKET,
          region: envVars.AWS_REGION,
          accessKeyId: envVars.AWS_ACCESS_KEY_ID,
          secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
          endpoint: envVars.AWS_S3_ENDPOINT,
        } : undefined,
      },
      fileUpload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB for documents
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,jpg,jpeg,png,csv,xlsx').split(','),
        uploadPath: process.env.UPLOAD_DIR || './uploads/documents',
      },
    },
    'notification-service': {
      ...baseConfig,
      port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3008'),
      redis: { ...baseConfig.redis, db: 8 },
    },
    'analytics-service': {
      ...baseConfig,
      port: parseInt(process.env.ANALYTICS_SERVICE_PORT || '3009'),
      redis: { ...baseConfig.redis, db: 9 },
    },
  };

  return serviceSpecificConfigs[serviceName] || baseConfig;
};

// Validate service configuration
export const validateServiceConfig = (serviceName: string): void => {
  // First validate the environment variables
  validateAndLoadEnv();
  
  const config = getServiceConfig(serviceName);
  
  if (!config.port || !config.host || !config.serviceName) {
    throw new Error(`Invalid configuration for service: ${serviceName}`);
  }
  
  if (!config.database?.host) {
    throw new Error(`Database configuration missing for service: ${serviceName}`);
  }
  
  if (!config.jwt?.secret) {
    throw new Error(`JWT configuration missing for service: ${serviceName}`);
  }
  
  console.log(`✅ Configuration validated for ${serviceName}`);
};

// Export the validation function for explicit use
export { validateAndLoadEnv };
