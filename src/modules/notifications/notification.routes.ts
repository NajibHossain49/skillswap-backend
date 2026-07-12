import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validate';
import { notificationQuerySchema } from './notification.schema';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    List the current user's notifications (paginated, optional unreadOnly)
 * @access  Private
 */
router.get(
  '/',
  validateQuery(notificationQuerySchema),
  notificationController.getNotifications.bind(notificationController),
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get the current user's unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  notificationController.getUnreadCount.bind(notificationController),
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all of the current user's notifications as read
 * @access  Private
 */
router.patch('/read-all', notificationController.markAllAsRead.bind(notificationController));

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read (must own it)
 * @access  Private
 */
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a single notification (must own it)
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

export default router;
