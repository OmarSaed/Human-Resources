import { PrismaClient } from '@prisma/client';

// Import types from Prisma schema - align with actual Prisma generated types
type User = {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: any[];
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  backupCodes: string[];
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  verificationToken: string | null;
  lastLogin: Date | null;
  lastLoginIP: string | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
};

type UserRole = 'SUPER_ADMIN' | 'HR_MANAGER' | 'HR_SPECIALIST' | 'DEPARTMENT_MANAGER' | 'EMPLOYEE';
import { createLogger, EventFactory, SYSTEM_EVENT_TYPES } from '@hrms/shared';
import { UserProfile, RegisterRequest, AuthError, AuthErrorCode } from '../types/auth.types';
import { PasswordService } from './password.service';
import { EmailService } from './email.service';
import { JWTService } from './jwt.service';
import { AuditService } from '@hrms/shared';

const logger = createLogger('user-service');
const prisma = new PrismaClient();
const auditService = new AuditService('auth-service');

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(
    userData: RegisterRequest,
    createdBy?: string
  ): Promise<UserProfile> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() }
      });

      if (existingUser) {
        throw new AuthError(
          AuthErrorCode.EMAIL_ALREADY_EXISTS,
          'Email address is already registered',
          409
        );
      }

      // Validate password
      const passwordValidation = PasswordService.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new AuthError(
          AuthErrorCode.PASSWORD_TOO_WEAK,
          'Password does not meet policy requirements',
          400,
          { errors: passwordValidation.errors }
        );
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(userData.password);

      // Generate verification token
      const verificationToken = JWTService.generateSecureToken();

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'EMPLOYEE' as UserRole,
          verificationToken,
          createdBy,
        },
        include: {
          permissions: true,
        },
      });

      // Send verification email
      await EmailService.sendVerificationEmail(user.email, verificationToken);

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: user.id,
        action: 'crud.create',
        userId: user.id,
        metadata: {
          email: user.email,
          role: user.role,
          createdBy,
          action: 'USER_CREATED',
          success: true
        }
      });

      // Publish user created event
      const event = EventFactory.createSystemEvent(
        SYSTEM_EVENT_TYPES.USER_AUTHENTICATED,
        'auth-service',
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          loginTime: new Date(),
        }
      );

      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return this.mapUserToProfile(user);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('User creation failed', error as Error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          permissions: true,
        },
      });

      return user ? this.mapUserToProfile(user) : null;
    } catch (error) {
      logger.error('Failed to get user by ID', error as Error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          permissions: true,
        },
      });

      return user;
    } catch (error) {
      logger.error('Failed to get user by email', error as Error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(
    userId: string,
    updateData: Partial<User>,
    updatedBy?: string
  ): Promise<UserProfile> {
    try {
      // Extract permissions from updateData to handle separately
      const { permissions, ...userData } = updateData as any;
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...userData,
          updatedBy,
          updatedAt: new Date(),
        },
        include: {
          permissions: true,
        },
      });

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: userId,
        action: 'crud.update',
        userId,
        changes: updateData,
        metadata: { updatedBy, action: 'USER_UPDATED', success: true }
      });

      logger.info('User updated successfully', {
        userId,
        changes: Object.keys(updateData),
      });

      return this.mapUserToProfile(user);
    } catch (error) {
      logger.error('User update failed', error as Error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Validate password change
      await PasswordService.validatePasswordChange(userId, currentPassword, newPassword);

      // Hash new password
      const hashedPassword = await PasswordService.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: userId,
        action: 'security.password_changed',
        userId,
        metadata: { action: 'PASSWORD_CHANGED', success: true }
      });

      logger.info('User password updated successfully', { userId });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Password update failed', error as Error);
      throw new Error('Failed to update password');
    }
  }

  /**
   * Verify user email
   */
  static async verifyEmail(token: string): Promise<UserProfile> {
    try {
      const user = await prisma.user.findFirst({
        where: { verificationToken: token },
        include: { permissions: true },
      });

      if (!user) {
        throw new AuthError(
          AuthErrorCode.TOKEN_INVALID,
          'Invalid verification token',
          400
        );
      }

      // Update user as verified
      const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          updatedAt: new Date(),
        },
        include: { permissions: true },
      });

       // Log audit event
       await auditService.logAction({
         entityType: 'user',
         entityId: user.id,
         action: 'crud.update',
         userId: user.id,
         changes: { emailVerified: true, verificationToken: null },
         metadata: { action: 'EMAIL_VERIFIED', success: true }
       });
   

      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      return this.mapUserToProfile(verifiedUser);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Email verification failed', error as Error);
      throw new Error('Email verification failed');
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new AuthError(
          AuthErrorCode.INVALID_RESET_TOKEN,
          'Invalid or expired reset token',
          400
        );
      }

      // Validate new password
      const passwordValidation = PasswordService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new AuthError(
          AuthErrorCode.PASSWORD_TOO_WEAK,
          'Password does not meet policy requirements',
          400,
          { errors: passwordValidation.errors }
        );
      }

      // Check password reuse
      const isReused = await PasswordService.checkPasswordReuse(user.id, newPassword);
      if (isReused) {
        throw new AuthError(
          AuthErrorCode.PASSWORD_TOO_WEAK,
          'Password was used recently and cannot be reused',
          400
        );
      }

      // Hash new password
      const hashedPassword = await PasswordService.hashPassword(newPassword);

      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          failedLoginCount: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        },
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      });

      // Send password changed notification
      await EmailService.sendPasswordChangedNotification(user.email);

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: user.id,
        action: 'security.password_reset',
        userId: user.id,
        metadata: { action: 'PASSWORD_RESET', success: true }
      });

      logger.info('Password reset successfully', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Password reset failed', error as Error);
      throw new Error('Password reset failed');
    }
  }

  /**
   * Initiate password reset
   */
  static async initiatePasswordReset(email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if email exists for security
        logger.warn('Password reset requested for non-existent email', { email });
        return;
      }

      // Generate reset token
      const resetToken = JWTService.generateSecureToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
          updatedAt: new Date(),
        },
      });

      // Send reset email
      await EmailService.sendPasswordResetEmail(user.email, resetToken);

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: user.id,
        action: 'security.password_reset_requested',
        userId: user.id,
        metadata: { email: user.email, action: 'PASSWORD_RESET_REQUESTED', success: true }
      });

      logger.info('Password reset initiated', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('Password reset initiation failed', error as Error);
      throw new Error('Failed to initiate password reset');
    }
  }

  /**
   * Lock user account
   */
  static async lockAccount(userId: string, lockDurationMinutes: number): Promise<void> {
    try {
      const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil,
          updatedAt: new Date(),
        },
      });

      // Get user for email notification
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user) {
        await EmailService.sendAccountLockedNotification(user.email, lockedUntil);
      }

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: userId,
        action: 'security.account_locked',
        userId,
        metadata: { 
          lockDurationMinutes, 
          lockedUntil: lockedUntil.toISOString(), 
          action: 'ACCOUNT_LOCKED', 
          success: true 
        }
      });

      logger.warn('User account locked', {
        userId,
        lockDurationMinutes,
        lockedUntil,
      });
    } catch (error) {
      logger.error('Account lock failed', error as Error);
      throw new Error('Failed to lock account');
    }
  }

  /**
   * Unlock user account
   */
  static async unlockAccount(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: null,
          failedLoginCount: 0,
          updatedAt: new Date(),
        },
      });

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: userId,
        action: 'security.account_unlocked',
        userId,
        metadata: { action: 'ACCOUNT_UNLOCKED', success: true }
      });

      logger.info('User account unlocked', { userId });
    } catch (error) {
      logger.error('Account unlock failed', error as Error);
      throw new Error('Failed to unlock account');
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          permissions: true,
        },
      });

      if (!user) {
        return [];
      }

      return user.permissions.map((p: any) => `${p.resource}:${p.action}`);
    } catch (error) {
      logger.error('Failed to get user permissions', error as Error);
      return [];
    }
  }

  /**
   * Map database user to profile
   */
  private static mapUserToProfile(user: User & { permissions?: any[] }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions?.map((p: any) => `${p.resource}:${p.action}`) || [],
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      lastLogin: user.lastLogin || undefined,
      createdAt: user.createdAt,
    };
  }
}
