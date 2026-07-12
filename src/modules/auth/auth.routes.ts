import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema';
import { authenticate, strictAuth } from '../../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register.bind(authController),
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login.bind(authController));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  authController.refresh.bind(authController),
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Public
 */
router.post('/logout', validate(refreshTokenSchema), authController.logout.bind(authController));

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll.bind(authController));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info from token
 * @access  Private
 */
router.get('/me', authenticate, authController.me.bind(authController));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password, revoke all sessions, and return a fresh token pair
 * @access  Private
 */
router.post(
  '/change-password',
  strictAuth,
  validate(changePasswordSchema),
  authController.changePassword.bind(authController),
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request a password reset link (always responds generically)
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword.bind(authController),
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using a valid reset token
 * @access  Public
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword.bind(authController),
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify an email address using a verification token
 * @access  Public
 */
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  authController.verifyEmail.bind(authController),
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend the email verification link
 * @access  Private
 */
router.post(
  '/resend-verification',
  authLimiter,
  authenticate,
  authController.resendVerification.bind(authController),
);

/**
 * @route   GET /api/auth/sessions
 * @desc    List the current user's active sessions (devices)
 * @access  Private
 */
router.get('/sessions', authenticate, authController.listSessions.bind(authController));

/**
 * @route   DELETE /api/auth/sessions/:id
 * @desc    Revoke a single session (device)
 * @access  Private
 */
router.delete('/sessions/:id', authenticate, authController.revokeSession.bind(authController));

export default router;
