import { Router } from 'express';
import { validate } from '@hrms/shared';
import { AuthController } from '../controllers/auth.controller';
import { 
  authenticate, 
  authorize, 
  adminOnly, 
  sensitiveOperation,
  auditAction,
} from '../middleware/auth.middleware';
import { authValidationSchemas } from '../validation/auth.validation';

const router = Router();

// Public routes (no authentication required)
router.post('/login', 
  validate(authValidationSchemas.login),
  auditAction('LOGIN_ATTEMPT'),
  AuthController.login
);

router.post('/register',
  validate(authValidationSchemas.register),
  auditAction('REGISTRATION_ATTEMPT'),
  AuthController.register
);

router.post('/refresh-token',
  validate(authValidationSchemas.refreshToken),
  AuthController.refreshToken
);

router.post('/forgot-password',
  validate(authValidationSchemas.forgotPassword),
  sensitiveOperation,
  auditAction('PASSWORD_RESET_REQUEST'),
  AuthController.forgotPassword
);

router.post('/reset-password',
  validate(authValidationSchemas.resetPassword),
  sensitiveOperation,
  auditAction('PASSWORD_RESET'),
  AuthController.resetPassword
);

router.post('/verify-email',
  validate(authValidationSchemas.verifyEmail),
  auditAction('EMAIL_VERIFICATION'),
  AuthController.verifyEmail
);

// Protected routes (authentication required)
router.use(authenticate);

// User profile routes
router.get('/profile', AuthController.getProfile);

router.put('/profile',
  validate(authValidationSchemas.updateProfile),
  auditAction('PROFILE_UPDATE'),
  AuthController.updateProfile
);

router.post('/change-password',
  validate(authValidationSchemas.changePassword),
  sensitiveOperation,
  auditAction('PASSWORD_CHANGE'),
  AuthController.changePassword
);

router.post('/logout',
  auditAction('LOGOUT'),
  AuthController.logout
);

// Token validation route
router.get('/validate-token', AuthController.validateToken);

// Session management routes
router.get('/sessions', AuthController.getSessions);

router.delete('/sessions/:sessionId',
  sensitiveOperation,
  auditAction('SESSION_TERMINATION'),
  AuthController.terminateSession
);

router.delete('/sessions',
  sensitiveOperation,
  auditAction('ALL_SESSIONS_TERMINATION'),
  AuthController.terminateAllSessions
);

// MFA routes
router.get('/mfa/status', AuthController.getMFAStatus);

router.post('/mfa/setup',
  sensitiveOperation,
  auditAction('MFA_SETUP'),
  AuthController.setupMFA
);

router.post('/mfa/enable',
  validate(authValidationSchemas.enableMFA),
  sensitiveOperation,
  auditAction('MFA_ENABLE'),
  AuthController.enableMFA
);

router.post('/mfa/disable',
  validate(authValidationSchemas.disableMFA),
  sensitiveOperation,
  auditAction('MFA_DISABLE'),
  AuthController.disableMFA
);

router.post('/mfa/backup-codes',
  sensitiveOperation,
  auditAction('MFA_BACKUP_CODES_GENERATE'),
  AuthController.generateBackupCodes
);

export default router;
