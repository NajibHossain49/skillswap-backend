import { Router } from 'express';
import { adminController } from './admin.controller';
import { creditController } from '../credits/credit.controller';
import { mentorController } from '../mentors/mentor.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { audit } from '../../middleware/auditLog';
import { adminAdjustSchema } from '../credits/credit.schema';
import { mentorApplicationQuerySchema, reviewApplicationSchema } from '../mentors/mentor.schema';
import { auditLogQuerySchema } from './admin.schema';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get platform dashboard stats
 * @access  Admin
 */
router.get('/dashboard', adminController.getDashboard.bind(adminController));

/**
 * @route   GET /api/admin/activity
 * @desc    Get platform activity for last N days
 * @access  Admin
 */
router.get('/activity', adminController.getPlatformActivity.bind(adminController));

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Query the admin audit trail
 * @access  Admin
 */
router.get(
  '/audit-logs',
  validateQuery(auditLogQuerySchema),
  adminController.getAuditLogs.bind(adminController),
);

/**
 * @route   POST /api/admin/credits/adjust
 * @desc    Manually adjust a user's credit balance (positive or negative)
 * @access  Admin
 */
router.post(
  '/credits/adjust',
  validate(adminAdjustSchema),
  audit('credit.adjust', 'User', (req) => req.body.userId),
  creditController.adjust.bind(creditController),
);

/**
 * @route   GET /api/admin/mentor-applications
 * @desc    List mentor applications (defaults to PENDING)
 * @access  Admin
 */
router.get(
  '/mentor-applications',
  validateQuery(mentorApplicationQuerySchema),
  mentorController.getApplications.bind(mentorController),
);

/**
 * @route   PATCH /api/admin/mentor-applications/:userId
 * @desc    Approve or reject a mentor application
 * @access  Admin
 */
router.patch(
  '/mentor-applications/:userId',
  validate(reviewApplicationSchema),
  audit('mentor.application_review', 'User', (req) => req.params.userId),
  mentorController.reviewApplication.bind(mentorController),
);

export default router;
