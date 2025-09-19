import bcrypt from 'bcryptjs';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const authConfig = getServiceConfig('auth-service');
import { PasswordPolicy, AuthError, AuthErrorCode } from '../types/auth.types';
import { PrismaClient } from '@prisma/client';

const logger = createLogger('password-service');
const prisma = new PrismaClient();

export class PasswordService {
  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = (authConfig.security as any).bcryptRounds;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed', error as Error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      
      logger.debug('Password verification completed', { isValid });
      return isValid;
    } catch (error) {
      logger.error('Password verification failed', error as Error);
      return false;
    }
  }

  /**
   * Validate password against policy
   */
  static validatePassword(
    password: string, 
    policy: PasswordPolicy = authConfig.security.passwordPolicy
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    // Check uppercase requirement
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase requirement
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check numbers requirement
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check special characters requirement
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^(012|123|234|345|456|567|678|789|890)+/, // Sequential numbers
      /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // Sequential letters
    ];

    if (weakPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains weak patterns');
    }

    // Check against common passwords
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty', 
      'abc123', 'password1', 'admin', 'letmein', 'welcome'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if password was used recently
   */
  static async checkPasswordReuse(userId: string, newPassword: string): Promise<boolean> {
    try {
      // This would typically check against a password history table
      // For now, we'll implement a basic check against current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!user) {
        return false;
      }

      const isSameAsCurrent = await this.verifyPassword(newPassword, user.password);
      
      if (isSameAsCurrent) {
        logger.warn('User attempted to reuse current password', { userId });
        return true;
      }

      // TODO: Implement password history checking
      // const passwordHistory = await prisma.passwordHistory.findMany({
      //   where: { userId },
      //   take: authConfig.security.passwordPolicy.preventReuse,
      //   orderBy: { createdAt: 'desc' }
      // });

      return false;
    } catch (error) {
      logger.error('Password reuse check failed', error as Error);
      return false;
    }
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each required category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password: string): {
    score: number; // 0-100
    level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 8) score += 25;
    else feedback.push('Use at least 8 characters');
    
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push('Add uppercase letters');
    
    if (/\d/.test(password)) score += 10;
    else feedback.push('Add numbers');
    
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    else feedback.push('Add special characters');

    // Pattern penalties
    if (/^(.)\1+$/.test(password)) {
      score -= 50;
      feedback.push('Avoid repeating characters');
    }
    
    if (/\d{4,}/.test(password)) {
      score -= 20;
      feedback.push('Avoid long sequences of numbers');
    }

    // Determine level
    let level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
    if (score < 30) level = 'very-weak';
    else if (score < 50) level = 'weak';
    else if (score < 70) level = 'fair';
    else if (score < 90) level = 'good';
    else level = 'strong';

    return { score: Math.max(0, Math.min(100, score)), level, feedback };
  }

  /**
   * Validate password change request
   */
  static async validatePasswordChange(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    // Get user's current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS, 
        'Current password is incorrect', 
        400
      );
    }

    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.isValid) {
      throw new AuthError(
        AuthErrorCode.PASSWORD_TOO_WEAK, 
        'Password does not meet policy requirements', 
        400, 
        { errors: validation.errors }
      );
    }

    // Check password reuse
    const isReused = await this.checkPasswordReuse(userId, newPassword);
    if (isReused) {
      throw new AuthError(
        AuthErrorCode.PASSWORD_TOO_WEAK, 
        'Password was used recently and cannot be reused', 
        400
      );
    }
  }

  /**
   * Get password policy
   */
  static async getPasswordPolicy(): Promise<PasswordPolicy> {
    try {
      const policy = await prisma.passwordPolicy.findFirst({
        orderBy: { updatedAt: 'desc' }
      });

      return policy || authConfig.security.passwordPolicy;
    } catch (error) {
      logger.error('Failed to get password policy from database', error as Error);
      return authConfig.security.passwordPolicy;
    }
  }

  /**
   * Update password policy
   */
  static async updatePasswordPolicy(policy: Partial<PasswordPolicy>): Promise<PasswordPolicy> {
    try {
      const updatedPolicy = await prisma.passwordPolicy.create({
        data: {
          ...authConfig.security.passwordPolicy,
          ...policy
        }
      });

      logger.info('Password policy updated', { policy: updatedPolicy });
      return updatedPolicy;
    } catch (error) {
      logger.error('Failed to update password policy', error as Error);
      throw new Error('Failed to update password policy');
    }
  }
}
