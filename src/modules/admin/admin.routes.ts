import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth';

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

export default router;
