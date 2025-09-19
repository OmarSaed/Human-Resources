// Common types shared across all HRMS services

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// API Response Types
export interface APIResponse<T = any> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, any>;
    sort?: string;
    searchTerm?: string;
    processingTime?: string;
  };
  links?: {
    self: string;
    next?: string;
    prev?: string;
    first?: string;
    last?: string;
  };
  errors?: APIError[];
  timestamp?: string;
  requestId?: string;
}

export interface APIError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Search and Filter Types
export interface BaseSearchParams extends PaginationParams {
  query?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export interface NumberRangeFilter {
  min?: number;
  max?: number;
}

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HR_MANAGER = 'HR_MANAGER',
  HR_SPECIALIST = 'HR_SPECIALIST',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

export interface Permission {
  resource: string;
  actions: Action[];
  conditions?: Record<string, any>;
}

export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'manage';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sessionId?: string;
  iat: number;
  exp: number;
}

// Common Employee Info (used across services)
export interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  department?: DepartmentInfo;
  position?: PositionInfo;
  manager?: BasicEmployeeInfo;
  profilePicture?: string;
}

export interface BasicEmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  managerId?: string;
}

export interface PositionInfo {
  id: string;
  title: string;
  level: number;
  departmentId: string;
}

// Address and Contact Types
export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ContactInfo {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: AddressInfo;
}

// Common Enums
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Validation Error Types
export interface ValidationError {
  code: string;
  message: string;
  field: string;
  value?: any;
  constraints?: string[];
}

export interface ServiceError extends APIError {
  service: string;
  timestamp: Date;
  traceId?: string;
}

// Analytics and Metrics Types
export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  trend?: TrendDirection;
  previousValue?: number;
  changePercentage?: number;
}

export enum TrendDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE'
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercentage: number;
}

export interface DashboardStats {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  color?: string;
}

// File and Media Types
export interface FileInfo {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface MediaInfo {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

// Notification Types
export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationData {
  type: NotificationType;
  priority: NotificationPriority;
  recipient: string;
  subject?: string;
  message: string;
  data?: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'minio';
  local?: {
    uploadPath: string;
    maxFileSize: number;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
}

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  port: number;
  host: string;
  serviceName: string;
  version: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  database: DatabaseConfig;
  redis: RedisConfig;
  kafka: KafkaConfig;
}

// Extended configuration interfaces for comprehensive service management
export interface ServiceConfig extends AppConfig {
  jwt: {
    secret: string;
    accessTokenSecret?: string;
    refreshTokenSecret?: string;
    expiresIn: string;
    refreshExpiresIn: string;
    issuer?: string;
    audience?: string;
  };
  database: DatabaseConfig & {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
  };
}

export interface ServiceConfigs {
  'api-gateway': ServiceConfig & {
    cors: {
      origins: string[];
      credentials: boolean;
    };
    rateLimiting: {
      global: {
        windowMs: number;
        maxRequests: number;
      };
      auth: {
        windowMs: number;
        maxRequests: number;
      };
    };
    security: {
      corsOrigins: string[];
      corsCredentials: boolean;
      requestSizeLimit: string;
    };
    services: Record<string, { url: string; timeout: number }>;
    circuitBreaker: {
      enabled: boolean;
      failureThreshold: number;
      timeout: number;
      resetTimeout: number;
    };
    monitoring: {
      enableMetrics: boolean;
      enableTracing: boolean;
      jaegerEndpoint?: string;
    };
  };
  
  'auth-service': ServiceConfig & {
    session: {
      secret: string;
      ttl: number;
      maxSessions: number;
    };
    mfa: {
      appName: string;
      backupCodesCount: number;
      window: number;
      required: boolean;
    };
    email: {
      from: string;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      templates: Record<string, string>;
    };
    security: {
      bcryptRounds: number;
      sessionTimeout: number;
      mfaRequired: boolean;
      accountLockout: {
        maxFailedAttempts: number;
        lockoutDuration: number;
        resetFailedAttemptsAfter: number;
      };
      passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        preventReuse: number;
        maxAge: number;
      };
      bruteForce: {
        freeRetries: number;
        minWait: number;
        maxWait: number;
        lifetime: number;
      };
    };
    rateLimiting: {
      login: {
        windowMs: number;
        maxAttempts: number;
      };
      registration: {
        windowMs: number;
        maxAttempts: number;
      };
      passwordReset: {
        windowMs: number;
        maxAttempts: number;
      };
    };
    oauth: {
      google: {
        clientId: string;
        clientSecret: string;
        callbackURL: string;
      };
      microsoft: {
        clientId: string;
        clientSecret: string;
        callbackURL: string;
      };
      enabledProviders: string[];
    };
    audit: {
      enableFullAudit: boolean;
      logSuccessfulLogins: boolean;
      logFailedLogins: boolean;
      retentionDays: number;
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
      enableAlerts: boolean;
      alertThresholds: {
        failedLoginRate: number;
        accountLockouts: number;
        suspiciousActivity: number;
      };
    };
  };
  
  'employee-service': ServiceConfig & {
    fileUpload: {
      maxFileSize: number;
      allowedTypes: string[];
      uploadPath: string;
      profilePicturePath: string;
      documentPath: string;
    };
    employee: {
      employeeNumberPrefix: string;
      employeeNumberLength: number;
      defaultCurrency: string;
      maxDirectReports: number;
      probationPeriodDays: number;
      minAge: number;
      maxAge: number;
      requiredFields: string[];
    };
    performance: {
      defaultReviewCycle: string;
      enableSelfReview: boolean;
      enable360Review: boolean;
      autoReminders: boolean;
      reminderDaysBefore: number;
      ratingScale: { min: number; max: number };
    };
    timeTracking: {
      enableTimeTracking: boolean;
      requireClockInOut: boolean;
      enableBreakTracking: boolean;
      enableLocationTracking: boolean;
      overtimeThreshold: number;
      maxDailyHours: number;
      workingDays: string[];
      workingHours: {
        start: string;
        end: string;
      };
    };
    leaveManagement: {
      enableLeaveRequests: boolean;
      autoApproveUpToDays: number;
      requireApproval: boolean;
      allowBackdatedRequests: boolean;
      maxAdvanceDays: number;
      defaultAnnualLeave: number;
      defaultSickLeave: number;
      carryOverLimit: number;
    };
    training: {
      enableTrainingTracking: boolean;
      autoEnrollNewEmployees: boolean;
      defaultTrainingBudget: number;
      certificateValidityDays: number;
      reminderDaysBefore: number;
    };
    audit: {
      enableAuditLog: boolean;
      retentionDays: number;
      sensitiveFields: string[];
      enableDataMasking: boolean;
    };
    notifications: {
      enableEmailNotifications: boolean;
      enableSlackNotifications: boolean;
      notificationEvents: string[];
      templates: Record<string, string>;
    };
    security: {
      enableFieldLevelSecurity: boolean;
      enableDataEncryption: boolean;
      enableAccessControl: boolean;
      sensitiveDataFields: string[];
      accessRules: Record<string, string[]>;
    };
    integrations: {
      enablePayrollIntegration: boolean;
      enableLDAPSync: boolean;
      enableBankingIntegration: boolean;
      payrollServiceUrl: string;
      ldapServer: string;
      bankingApiUrl: string;
    };
    monitoring: {
      enableMetrics: boolean;
      enableAnalytics: boolean;
      metricsInterval: number;
      enablePerformanceMonitoring: boolean;
      enableHealthChecks: boolean;
    };
    backup: {
      enableAutoBackup: boolean;
      backupInterval: string;
      backupRetentionDays: number;
      backupLocation: string;
    };
  };
  
  'time-attendance-service': ServiceConfig & {
    timeTracking: {
      enableGpsTracking: boolean;
      enableIpRestriction: boolean;
      allowedIPs: string[];
      graceMinutes: number;
      autoClockOutHours: number;
      enableBiometric: boolean;
      enableMobileClockIn: boolean;
      maxDailyHours: number;
      minBreakMinutes: number;
      maxBreakMinutes: number;
      roundingMinutes: number;
    };
    attendance: {
      defaultTimezone: string;
      workWeekStart: string;
      enableWeekendWork: boolean;
      lateThresholdMinutes: number;
      earlyLeaveThresholdMinutes: number;
      minimumWorkHours: number;
      attendanceGrading: {
        excellent: number;
        good: number;
        average: number;
      };
    };
    leaveManagement: {
      enableCarryForward: boolean;
      maxCarryForwardDays: number;
      defaultLeaveYear: string;
      minAdvanceNotice: number;
      maxAdvanceBooking: number;
      enableEmergencyLeave: boolean;
      autoApproveEmergency: boolean;
      enableLeaveEncashment: boolean;
      maxEncashmentDays: number;
      requiresHandover: boolean;
    };
    overtime: {
      enableOvertimeTracking: boolean;
      dailyOvertimeThreshold: number;
      weeklyOvertimeThreshold: number;
      monthlyOvertimeLimit: number;
      overtimeRates: {
        weekday: number;
        weekend: number;
        holiday: number;
      };
      requiresPreApproval: boolean;
      autoCalculateOT: boolean;
    };
    shiftManagement: {
      enableShiftRotation: boolean;
      enableShiftSwapping: boolean;
      swapAdvanceNotice: number;
      maxSwapsPerMonth: number;
      shiftBuffer: number;
      enableShiftBidding: boolean;
      autoScheduleGeneration: boolean;
    };
    reporting: {
      enableReports: boolean;
      autoGenerateMonthly: boolean;
      enableCustomReports: boolean;
      retentionMonths: number;
      reportFormats: string[];
      enableScheduledReports: boolean;
      emailReports: boolean;
    };
    notifications: {
      enableNotifications: boolean;
      notifyMissedClockOut: boolean;
      notifyOvertime: boolean;
      notifyLeaveApproval: boolean;
      notifyLateArrival: boolean;
      realTimeNotifications: boolean;
      emailNotifications: boolean;
      slackNotifications: boolean;
      pushNotifications: boolean;
    };
    compliance: {
      enableCompliance: boolean;
      laborLaws: {
        maxWeeklyHours: number;
        maxDailyHours: number;
        mandatoryBreaks: boolean;
        minimumRestPeriod: number;
      };
      auditTrail: {
        enableAuditTrail: boolean;
        retentionYears: number;
        auditAllChanges: boolean;
        requireApprovalForChanges: boolean;
      };
      dataPrivacy: {
        enableGDPRCompliance: boolean;
        dataRetentionYears: number;
        enableDataAnonymization: boolean;
        consentManagement: boolean;
      };
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
      enableAlerts: boolean;
      performanceThresholds: {
        maxResponseTime: number;
        maxErrorRate: number;
        minUptime: number;
      };
    };
  };
  
  'performance-service': ServiceConfig & {
    performance: {
      defaultReviewCycle: string;
      enableSelfReview: boolean;
      enable360Review: boolean;
      enableContinuousFeedback: boolean;
      autoReminders: boolean;
      reminderDaysBefore: number;
      ratingScale: { min: number; max: number };
      enableGoalTracking: boolean;
      enableCompetencyMapping: boolean;
      enableSuccessionPlanning: boolean;
      calibrationRequired: boolean;
    };
    goals: {
      enableGoalCascading: boolean;
      maxGoalsPerEmployee: number;
      allowSelfSetGoals: boolean;
      requireManagerApproval: boolean;
      enableOKRs: boolean;
      quarterlyCheckIns: boolean;
    };
    feedback: {
      enableRealTimeFeedback: boolean;
      allowAnonymousFeedback: boolean;
      enablePeerFeedback: boolean;
      feedbackFrequency: string;
      enableUpwardFeedback: boolean;
    };
    analytics: {
      enableAnalytics: boolean;
      performanceTrends: boolean;
      benchmarking: boolean;
      predictiveAnalytics: boolean;
      competencyAnalysis: boolean;
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
    };
  };
  
  'learning-service': ServiceConfig & {
    learning: {
      enableLearningPaths: boolean;
      enableCertifications: boolean;
      enableExternalCourses: boolean;
      autoEnrollment: boolean;
      skillTracking: boolean;
      competencyMapping: boolean;
    };
    courses: {
      maxEnrollments: number;
      enableVideoContent: boolean;
      enableAssessments: boolean;
      passingScore: number;
      maxAttempts: number;
      certificateValidity: number;
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
    };
  };
  
  'recruitment-service': ServiceConfig & {
    recruitment: {
      enableAIScreening: boolean;
      enableVideoInterviews: boolean;
      enableReferrals: boolean;
      enableJobPortalIntegration: boolean;
      autoResumeMatching: boolean;
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
    };
  };
  
  'document-service': ServiceConfig & {
    storage: {
      provider: 'local' | 's3';
      local: {
        uploadPath: string;
      };
      s3: {
        region?: string;
        bucket?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
      };
    };
    fileUpload: {
      maxFileSize: number;
      allowedTypes: string[];
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
    };
  };
  
  'notification-service': ServiceConfig & {
    email: {
      from: string;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
    };
    notifications: {
      enableEmail: boolean;
      enableSlack: boolean;
      enablePush: boolean;
      enableSMS: boolean;
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
    };
  };
  
  'analytics-service': ServiceConfig & {
    analytics: {
      enableRealTimeAnalytics: boolean;
      enablePredictiveAnalytics: boolean;
      enableCustomDashboards: boolean;
      dataRetentionDays: number;
    };
    monitoring: {
      enableMetrics: boolean;
      metricsInterval: number;
    };
  };
}

// Audit and Logging Types
export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, any>;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  userId?: string;
  action: string;
  resource: string;
  metadata: Record<string, any>;
  traceId: string;
  correlationId?: string;
}

// API Documentation Types
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters?: Parameter[];
  requestBody?: RequestBodySchema;
  responses: Record<string, ResponseSchema>;
  security?: SecurityRequirement[];
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header';
  description: string;
  required: boolean;
  schema: Schema;
}

export interface RequestBodySchema {
  description: string;
  required: boolean;
  content: Record<string, MediaTypeSchema>;
}

export interface ResponseSchema {
  description: string;
  content?: Record<string, MediaTypeSchema>;
}

export interface MediaTypeSchema {
  schema: Schema;
  examples?: Record<string, any>;
}

export interface Schema {
  type: string;
  properties?: Record<string, Schema>;
  required?: string[];
  example?: any;
}

export interface SecurityRequirement {
  type: 'bearer' | 'apiKey' | 'oauth2';
  name: string;
  description: string;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
  dependencies?: DependencyHealth[];
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  duration?: number;
}

export interface DependencyHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  url?: string;
}

// Export commonly used types for convenience
export type ID = string;
export type Timestamp = Date;
export type Email = string;
export type Phone = string;
export type URL = string;
