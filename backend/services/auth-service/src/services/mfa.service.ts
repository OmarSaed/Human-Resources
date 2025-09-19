import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const authConfig = getServiceConfig('auth-service');
import { SetupMFAResponse, AuthError, AuthErrorCode } from '../types/auth.types';
import { AuditService } from '@hrms/shared';

const logger = createLogger('mfa-service');
const prisma = new PrismaClient();
const auditService = new AuditService('auth-service');

export class MFAService {
  /**
   * Generate MFA secret and QR code for user
   */
  static async setupMFA(userId: string): Promise<SetupMFAResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, mfaEnabled: true },
      });

      if (!user) {
        throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
      }

      if (user.mfaEnabled) {
        throw new AuthError(
          AuthErrorCode.MFA_REQUIRED,
          'MFA is already enabled for this account',
          400
        );
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${authConfig.mfa.appName} (${user.email})`,
        issuer: authConfig.mfa.appName,
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: user.email,
        issuer: authConfig.mfa.appName,
        encoding: 'base32',
      });

      const qrCode = await QRCode.toDataURL(qrCodeUrl);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(authConfig.mfa.backupCodesCount);

      // Store the secret temporarily (not yet enabled)
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaSecret: secret.base32,
          backupCodes: backupCodes,
        },
      });

      logger.info('MFA setup initiated', {
        userId,
        email: user.email,
      });

      return {
        secret: secret.base32,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('MFA setup failed', error as Error);
      throw new Error('MFA setup failed');
    }
  }

  /**
   * Enable MFA after verification
   */
  static async enableMFA(userId: string, token: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mfaSecret: true, mfaEnabled: true },
      });

      if (!user) {
        throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
      }

      if (user.mfaEnabled) {
        throw new AuthError(
          AuthErrorCode.MFA_REQUIRED,
          'MFA is already enabled for this account',
          400
        );
      }

      if (!user.mfaSecret) {
        throw new AuthError(
          AuthErrorCode.INVALID_MFA_CODE,
          'MFA setup not initiated',
          400
        );
      }

      // Verify the token
      const isValid = this.verifyToken(user.mfaSecret, token);
      if (!isValid) {
        throw new AuthError(
          AuthErrorCode.INVALID_MFA_CODE,
          'Invalid MFA code',
          400
        );
      }

      // Enable MFA
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
        },
      });

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: userId,
        action: 'mfa_enabled',
        userId,
      });

      logger.info('MFA enabled successfully', { userId });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('MFA enable failed', error as Error);
      throw new Error('Failed to enable MFA');
    }
  }

  /**
   * Disable MFA
   */
  static async disableMFA(
    userId: string,
    password: string,
    token?: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          password: true, 
          mfaSecret: true, 
          mfaEnabled: true,
          backupCodes: true 
        },
      });

      if (!user) {
        throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
      }

      if (!user.mfaEnabled) {
        throw new AuthError(
          AuthErrorCode.INVALID_MFA_CODE,
          'MFA is not enabled for this account',
          400
        );
      }

      // Verify password (implementation depends on your password service)
      // const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
      // if (!isPasswordValid) {
      //   throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid password', 401);
      // }

      // If token is provided, verify it; otherwise check if it's a backup code
      let isValidAuth = false;
      
      if (token) {
        if (user.mfaSecret) {
          isValidAuth = this.verifyToken(user.mfaSecret, token);
        }
        
        // If regular token failed, check backup codes
        if (!isValidAuth && user.backupCodes.includes(token)) {
          isValidAuth = true;
          
          // Remove used backup code
          const updatedBackupCodes = user.backupCodes.filter((code: string) => code !== token);
          await prisma.user.update({
            where: { id: userId },
            data: { backupCodes: updatedBackupCodes },
          });
        }
      }

      if (!isValidAuth) {
        throw new AuthError(
          AuthErrorCode.INVALID_MFA_CODE,
          'Invalid MFA code or backup code',
          400
        );
      }

      // Disable MFA
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          backupCodes: [],
        },
      });

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: userId,
        action: 'mfa_disabled',
        userId,
      });

      logger.info('MFA disabled successfully', { userId });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('MFA disable failed', error as Error);
      throw new Error('Failed to disable MFA');
    }
  }

  /**
   * Verify MFA token
   */
  static async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          mfaSecret: true, 
          mfaEnabled: true, 
          backupCodes: true 
        },
      });

      if (!user || !user.mfaEnabled) {
        return false;
      }

      // Try regular TOTP token first
      if (user.mfaSecret && this.verifyToken(user.mfaSecret, token)) {
        return true;
      }

      // Try backup codes
      if (user.backupCodes.includes(token)) {
        // Remove used backup code
        const updatedBackupCodes = user.backupCodes.filter((code: string) => code !== token);
        await prisma.user.update({
          where: { id: userId },
          data: { backupCodes: updatedBackupCodes },
        });

        // Log backup code usage
        await auditService.logAction({
          entityType: 'user',
          entityId: userId,
          action: 'mfa_backup_code_used',
          userId,
        });

        logger.warn('MFA backup code used', {
          userId,
          remainingCodes: updatedBackupCodes.length,
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('MFA token verification failed', error as Error);
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true },
      });

      if (!user || !user.mfaEnabled) {
        throw new AuthError(
          AuthErrorCode.MFA_REQUIRED,
          'MFA is not enabled for this account',
          400
        );
      }

      const newBackupCodes = this.generateBackupCodes(authConfig.mfa.backupCodesCount);

      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: newBackupCodes },
      });

      // Log audit event
      await auditService.logAction({
        entityType: 'user',
        entityId: userId,
        action: 'mfa_backup_codes_regenerated',
        userId,
      });

      logger.info('New MFA backup codes generated', { userId });

      return newBackupCodes;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Backup code generation failed', error as Error);
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Get MFA status for user
   */
  static async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    backupCodesCount: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true, backupCodes: true },
      });

      if (!user) {
        throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
      }

      return {
        enabled: user.mfaEnabled,
        backupCodesCount: user.backupCodes?.length || 0,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Failed to get MFA status', error as Error);
      throw new Error('Failed to get MFA status');
    }
  }

  /**
   * Verify TOTP token
   */
  private static verifyToken(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: authConfig.mfa.window,
      });
    } catch (error) {
      logger.error('Token verification failed', error as Error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Check if backup codes are running low
   */
  static async checkBackupCodesStatus(userId: string): Promise<{
    total: number;
    remaining: number;
    needsRefresh: boolean;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { backupCodes: true },
      });

      const remaining = user?.backupCodes?.length || 0;
      const total = authConfig.mfa.backupCodesCount;
      const needsRefresh = remaining <= 2; // Alert when 2 or fewer codes remain

      return {
        total,
        remaining,
        needsRefresh,
      };
    } catch (error) {
      logger.error('Failed to check backup codes status', error as Error);
      return {
        total: authConfig.mfa.backupCodesCount,
        remaining: 0,
        needsRefresh: true,
      };
    }
  }
}
