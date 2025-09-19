import jwt from 'jsonwebtoken';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const authConfig = getServiceConfig('auth-service');
import { JWTPayload, RefreshTokenPayload, UserProfile } from '../types/auth.types';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('jwt-service');

export class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(user: UserProfile, sessionId: string): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      sessionId,
    };

    try {
      const token = jwt.sign(payload, authConfig.jwt.accessTokenSecret, {
        expiresIn: authConfig.jwt.accessTokenExpiry,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        subject: user.id,
      } as jwt.SignOptions);

      logger.info('Access token generated', {
        userId: user.id,
        sessionId,
        expiresIn: authConfig.jwt.accessTokenExpiry,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate access token', error as Error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string): { token: string; tokenId: string } {
    const tokenId = uuidv4();
    
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId,
      tokenId,
    };

    try {
      const token = jwt.sign(payload, authConfig.jwt.refreshTokenSecret, {
        expiresIn: authConfig.jwt.refreshTokenExpiry,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        subject: userId,
        jwtid: tokenId,
      } as jwt.SignOptions);

      logger.info('Refresh token generated', {
        userId,
        tokenId,
        expiresIn: authConfig.jwt.refreshTokenExpiry,
      });

      return { token, tokenId };
    } catch (error) {
      logger.error('Failed to generate refresh token', error as Error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.accessTokenSecret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      }) as JWTPayload;

      logger.debug('Access token verified', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
      });

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Access token expired', { token: token.substring(0, 20) + '...' });
        throw new Error('TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token', { token: token.substring(0, 20) + '...' });
        throw new Error('TOKEN_INVALID');
      } else {
        logger.error('Access token verification failed', error as Error);
        throw new Error('TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.refreshTokenSecret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      }) as RefreshTokenPayload;

      logger.debug('Refresh token verified', {
        userId: decoded.userId,
        tokenId: decoded.tokenId,
      });

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token expired', { token: token.substring(0, 20) + '...' });
        throw new Error('REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token', { token: token.substring(0, 20) + '...' });
        throw new Error('REFRESH_TOKEN_INVALID');
      } else {
        logger.error('Refresh token verification failed', error as Error);
        throw new Error('REFRESH_TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Token decode failed', error as Error);
      return null;
    }
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get token expiry', error as Error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry.getTime() < Date.now();
  }

  /**
   * Get remaining time until token expires
   */
  static getTimeUntilExpiry(token: string): number {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return 0;
    return Math.max(0, expiry.getTime() - Date.now());
  }

  /**
   * Generate secure random token for password reset, email verification, etc.
   */
  static generateSecureToken(length: number = 32): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  /**
   * Generate JWT for email verification
   */
  static generateVerificationToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      purpose: 'email_verification',
    };

    return jwt.sign(payload, authConfig.jwt.accessTokenSecret, {
      expiresIn: '24h', // Verification tokens expire in 24 hours
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      subject: userId,
    });
  }

  /**
   * Generate JWT for password reset
   */
  static generatePasswordResetToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      purpose: 'password_reset',
    };

    return jwt.sign(payload, authConfig.jwt.accessTokenSecret, {
      expiresIn: '1h', // Reset tokens expire in 1 hour
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      subject: userId,
    });
  }

  /**
   * Verify special purpose token (verification, reset, etc.)
   */
  static verifySpecialToken(token: string, expectedPurpose: string): any {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.accessTokenSecret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      }) as any;

      if (decoded.purpose !== expectedPurpose) {
        throw new Error('Invalid token purpose');
      }

      return decoded;
    } catch (error) {
      logger.error('Special token verification failed', error as Error);
      throw error;
    }
  }
}
