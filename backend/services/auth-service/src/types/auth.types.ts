import { User, UserRole } from '@prisma/client';

// Re-export UserRole for other modules
export { UserRole };

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  expiresIn: number;
  mfaRequired?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// MFA types
export interface SetupMFAResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface EnableMFARequest {
  mfaCode: string;
}

export interface DisableMFARequest {
  password: string;
  mfaCode: string;
}

// User profile types
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

// JWT payload types
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

// Session types
export interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  ipAddress: string;
  userAgent: string;
  device?: string;
  location?: string;
  lastActivity: Date;
}

// Security types
export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  accountLockout: AccountLockoutPolicy;
  sessionTimeout: number;
  mfaRequired: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
  maxAge: number;
}

export interface AccountLockoutPolicy {
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
  resetFailedAttemptsAfter: number; // minutes
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  skipSuccessfulRequests: boolean;
  keyGenerator?: (req: any) => string;
}

// Audit types
export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  success: boolean;
  error?: string;
}

// OAuth types
export interface OAuthProfile {
  id: string;
  provider: 'google' | 'microsoft' | 'github';
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

export interface OAuthCallback {
  code: string;
  state?: string;
  error?: string;
}

// Permission types
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// API Response types
export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
}

// Error types
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  INVALID_MFA_CODE = 'INVALID_MFA_CODE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_RESET_TOKEN = 'INVALID_RESET_TOKEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS'
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
