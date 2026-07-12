import { Router } from 'express';
import { adminController } from './admin.controller';
import { creditController } from '../credits/credit.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { adminAdjustSchema } from '../credits/credit.schema';

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
 * @route   POST /api/admin/credits/adjust
 * @desc    Manually adjust a user's credit balance (positive or negative)
 * @access  Admin
 */
router.post(
  '/credits/adjust',
  validate(adminAdjustSchema),
  creditController.adjust.bind(creditController),
);

export default router;
