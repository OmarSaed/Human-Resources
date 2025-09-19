import nodemailer from 'nodemailer';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const authConfig = getServiceConfig('auth-service');

const logger = createLogger('email-service');

export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize email transporter
   */
  static initialize(): void {
    this.transporter = nodemailer.createTransport({
      host: authConfig.email.smtp.host,
      port: authConfig.email.smtp.port,
      secure: authConfig.email.smtp.secure,
      auth: authConfig.email.smtp.auth,
    });

    logger.info('Email service initialized', {
      host: authConfig.email.smtp.host,
      port: authConfig.email.smtp.port,
    });
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      const mailOptions = {
        from: authConfig.email.from,
        to: email,
        subject: 'Welcome to HRMS',
        html: this.getWelcomeEmailTemplate(firstName),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Welcome email sent', { email });
    } catch (error) {
      logger.error('Failed to send welcome email', error as Error);
      throw new Error('Failed to send welcome email');
    }
  }

  /**
   * Send email verification
   */
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: authConfig.email.from,
        to: email,
        subject: 'Verify Your Email Address',
        html: this.getVerificationEmailTemplate(verificationUrl),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Verification email sent', { email });
    } catch (error) {
      logger.error('Failed to send verification email', error as Error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: authConfig.email.from,
        to: email,
        subject: 'Reset Your Password',
        html: this.getPasswordResetEmailTemplate(resetUrl),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to send password reset email', error as Error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send password changed notification
   */
  static async sendPasswordChangedNotification(email: string): Promise<void> {
    try {
      const mailOptions = {
        from: authConfig.email.from,
        to: email,
        subject: 'Password Changed Successfully',
        html: this.getPasswordChangedTemplate(),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Password changed notification sent', { email });
    } catch (error) {
      logger.error('Failed to send password changed notification', error as Error);
      throw new Error('Failed to send password changed notification');
    }
  }

  /**
   * Send account locked notification
   */
  static async sendAccountLockedNotification(
    email: string,
    lockedUntil: Date
  ): Promise<void> {
    try {
      const mailOptions = {
        from: authConfig.email.from,
        to: email,
        subject: 'Account Temporarily Locked',
        html: this.getAccountLockedTemplate(lockedUntil),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Account locked notification sent', { email });
    } catch (error) {
      logger.error('Failed to send account locked notification', error as Error);
      throw new Error('Failed to send account locked notification');
    }
  }

  /**
   * Send login alert
   */
  static async sendLoginAlert(
    email: string,
    ipAddress: string,
    userAgent: string,
    location?: string
  ): Promise<void> {
    try {
      const mailOptions = {
        from: authConfig.email.from,
        to: email,
        subject: 'New Login to Your Account',
        html: this.getLoginAlertTemplate(ipAddress, userAgent, location),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Login alert sent', { email, ipAddress });
    } catch (error) {
      logger.error('Failed to send login alert', error as Error);
      throw new Error('Failed to send login alert');
    }
  }

  /**
   * Welcome email template
   */
  private static getWelcomeEmailTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to HRMS</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Welcome to our Human Resource Management System. We're excited to have you on board!</p>
            <p>Your account has been created successfully. You can now log in to access all the features available to you.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The HRMS Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Email verification template
   */
  private static getVerificationEmailTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Email Verification Required</h2>
            <p>Thank you for registering with HRMS. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset email template
   */
  private static getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This reset link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password changed notification template
   */
  private static getPasswordChangedTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <h2>Password Updated Successfully</h2>
            <p>Your password has been changed successfully. This email is to confirm that the change was made.</p>
            <p><strong>When:</strong> ${new Date().toLocaleString()}</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <p>For your security, all active sessions have been logged out and you'll need to log in again with your new password.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Account locked notification template
   */
  private static getAccountLockedTemplate(lockedUntil: Date): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ffc107; color: #212529; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Temporarily Locked</h1>
          </div>
          <div class="content">
            <h2>Security Alert</h2>
            <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
            <p><strong>Locked until:</strong> ${lockedUntil.toLocaleString()}</p>
            <p>This is a security measure to protect your account. Your account will be automatically unlocked at the time specified above.</p>
            <p>If you believe this was caused by unauthorized access attempts, please contact our security team immediately.</p>
            <p>To prevent future lockouts, ensure you're using the correct password and consider enabling two-factor authentication.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Login alert template
   */
  private static getLoginAlertTemplate(
    ipAddress: string,
    userAgent: string,
    location?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .info { background: #e9ecef; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Login Alert</h1>
          </div>
          <div class="content">
            <h2>New Login to Your Account</h2>
            <p>We detected a new login to your account. Here are the details:</p>
            <div class="info">
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
              <p><strong>Device/Browser:</strong> ${userAgent}</p>
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
            </div>
            <p>If this was you, you can safely ignore this email.</p>
            <p>If you don't recognize this login, please secure your account immediately by:</p>
            <ul>
              <li>Changing your password</li>
              <li>Enabling two-factor authentication</li>
              <li>Reviewing your account activity</li>
              <li>Contacting our support team</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
