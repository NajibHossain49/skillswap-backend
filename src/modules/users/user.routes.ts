import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { updateProfileSchema, updateUserRoleSchema, userQuerySchema } from './user.schema';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', userController.getMyProfile.bind(userController));

/**
 * @route   PATCH /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.patch(
  '/profile',
  validate(updateProfileSchema),
  userController.updateMyProfile.bind(userController),
);

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Admin
 */
router.get(
  '/',
  authorize('ADMIN'),
  validateQuery(userQuerySchema),
  userController.getAllUsers.bind(userController),
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Admin
 */
router.get('/:id', authorize('ADMIN'), userController.getUserById.bind(userController));

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update user role (Admin only)
 * @access  Admin
 */
router.patch(
  '/:id/role',
  authorize('ADMIN'),
  validate(updateUserRoleSchema),
  userController.updateUserRole.bind(userController),
);

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Deactivate user (Admin only)
 * @access  Admin
 */
router.patch(
  '/:id/deactivate',
  authorize('ADMIN'),
  userController.deactivateUser.bind(userController),
);

/**
 * @route   PATCH /api/users/:id/activate
 * @desc    Activate user (Admin only)
 * @access  Admin
 */
router.patch(
  '/:id/activate',
  authorize('ADMIN'),
  userController.activateUser.bind(userController),
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin only)
 * @access  Admin
 */
router.delete('/:id', authorize('ADMIN'), userController.deleteUser.bind(userController));

export default router;
