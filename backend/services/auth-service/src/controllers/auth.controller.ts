import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@hrms/shared';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { MFAService } from '../services/mfa.service';
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
  EnableMFARequest,
  DisableMFARequest,
  AuthResponse,
  AuthError,
} from '../types/auth.types';

const logger = createLogger('auth-controller');

export class AuthController {
  /**
   * User login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await AuthService.login(loginData, ipAddress, userAgent);

      const response: AuthResponse = {
        success: true,
        data: result,
        message: result.mfaRequired ? 'MFA code required' : 'Login successful',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * User logout
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const user = (req as any).user;
      const sessionId = (req as any).sessionId;

      await AuthService.logout(user.userId, sessionId, refreshToken);

      const response: AuthResponse = {
        success: true,
        message: 'Logout successful',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshData: RefreshTokenRequest = req.body;
      const result = await AuthService.refreshToken(refreshData);

      const response: AuthResponse = {
        success: true,
        data: result,
        message: 'Token refreshed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * User registration
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body;
      const user = await UserService.createUser(registerData);

      const response: AuthResponse = {
        success: true,
        data: { user },
        message: 'Registration successful. Please check your email to verify your account.',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token }: VerifyEmailRequest = req.body;
      const user = await UserService.verifyEmail(token);

      const response: AuthResponse = {
        success: true,
        data: { user },
        message: 'Email verified successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email }: ForgotPasswordRequest = req.body;
      await UserService.initiatePasswordReset(email);

      const response: AuthResponse = {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword }: ResetPasswordRequest = req.body;
      await UserService.resetPassword(token, newPassword);

      const response: AuthResponse = {
        success: true,
        message: 'Password reset successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
      const user = (req as any).user;

      await UserService.updatePassword(user.userId, currentPassword, newPassword);

      const response: AuthResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const profile = await UserService.getUserById(user.userId);

      const response: AuthResponse = {
        success: true,
        data: { user: profile },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      const { password, email, role, ...allowedUpdates } = updateData;

      const updatedUser = await UserService.updateUser(user.userId, allowedUpdates, user.userId);

      const response: AuthResponse = {
        success: true,
        data: { user: updatedUser },
        message: 'Profile updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user sessions
   */
  static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const sessions = await AuthService.getUserSessions(user.userId);

      const response: AuthResponse = {
        success: true,
        data: { sessions },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Terminate specific session
   */
  static async terminateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { sessionId } = req.params;

      await AuthService.terminateSession(user.userId, sessionId);

      const response: AuthResponse = {
        success: true,
        message: 'Session terminated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Terminate all sessions (logout from all devices)
   */
  static async terminateAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      await AuthService.revokeAllUserAccess(user.userId);

      const response: AuthResponse = {
        success: true,
        message: 'All sessions terminated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Setup MFA
   */
  static async setupMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const mfaSetup = await MFAService.setupMFA(user.userId);

      const response: AuthResponse = {
        success: true,
        data: mfaSetup,
        message: 'MFA setup initiated',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable MFA
   */
  static async enableMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { mfaCode }: EnableMFARequest = req.body;

      await MFAService.enableMFA(user.userId, mfaCode);

      const response: AuthResponse = {
        success: true,
        message: 'MFA enabled successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable MFA
   */
  static async disableMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { password, mfaCode }: DisableMFARequest = req.body;

      await MFAService.disableMFA(user.userId, password, mfaCode);

      const response: AuthResponse = {
        success: true,
        message: 'MFA disabled successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get MFA status
   */
  static async getMFAStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const mfaStatus = await MFAService.getMFAStatus(user.userId);

      const response: AuthResponse = {
        success: true,
        data: mfaStatus,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateBackupCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const backupCodes = await MFAService.generateNewBackupCodes(user.userId);

      const response: AuthResponse = {
        success: true,
        data: { backupCodes },
        message: 'New backup codes generated',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate token (for token validation endpoint)
   */
  static async validateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;

      const response: AuthResponse = {
        success: true,
        data: { 
          valid: true,
          user: {
            id: user.userId,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
          }
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
