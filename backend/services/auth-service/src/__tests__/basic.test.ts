import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { PasswordService } from '../services/password.service';
import { JWTService } from '../services/jwt.service';

describe('Basic Service Tests', () => {
  describe('PasswordService', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await PasswordService.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await PasswordService.hashPassword(password);
      
      const isValid = await PasswordService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await PasswordService.verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should validate password policy', () => {
      const validPassword = 'ValidPass123!';
      const validation = PasswordService.validatePassword(validPassword);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const weakPassword = '123';
      const validation = PasswordService.validatePassword(weakPassword);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should check password strength', () => {
      const strongPassword = 'VeryStrongPassword123!@#';
      const result = PasswordService.checkPasswordStrength(strongPassword);
      
      expect(result.score).toBeGreaterThan(70);
      expect(['good', 'strong']).toContain(result.level);
    });
  });

  describe('JWTService', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE' as any,
      permissions: ['read:self'],
      isActive: true,
      emailVerified: true,
      mfaEnabled: false,
      createdAt: new Date(),
    };

    it('should generate access token', () => {
      const sessionId = 'session-123';
      const token = JWTService.generateAccessToken(mockUser, sessionId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const result = JWTService.generateRefreshToken(mockUser.id);
      
      expect(result.token).toBeDefined();
      expect(result.tokenId).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);
    });

    it('should verify access token', () => {
      const sessionId = 'session-123';
      const token = JWTService.generateAccessToken(mockUser, sessionId);
      
      const payload = JWTService.verifyAccessToken(token);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
      expect(payload.sessionId).toBe(sessionId);
    });

    it('should generate secure tokens', () => {
      const token1 = JWTService.generateSecureToken();
      const token2 = JWTService.generateSecureToken();
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(32);
    });

    it('should handle token expiry', () => {
      const sessionId = 'session-123';
      const token = JWTService.generateAccessToken(mockUser, sessionId);
      
      const expiry = JWTService.getTokenExpiry(token);
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry!.getTime()).toBeGreaterThan(Date.now());
      
      const isExpired = JWTService.isTokenExpired(token);
      expect(isExpired).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have required environment variables', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });
});
