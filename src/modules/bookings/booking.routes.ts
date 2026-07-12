import { Router } from 'express';
import { bookingController } from './booking.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createBookingSchema, rejectBookingSchema, bookingQuerySchema } from './booking.schema';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/bookings
 * @desc    Create a booking request
 * @access  Learner
 */
router.post(
  '/',
  authorize('LEARNER'),
  validate(createBookingSchema),
  bookingController.createRequest.bind(bookingController),
);

/**
 * @route   GET /api/bookings
 * @desc    List booking requests (role-scoped, filterable, paginated)
 * @access  Private
 */
router.get(
  '/',
  validateQuery(bookingQuerySchema),
  bookingController.getRequests.bind(bookingController),
);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get a booking request (participant or admin)
 * @access  Private
 */
router.get('/:id', bookingController.getRequestById.bind(bookingController));

/**
 * @route   PATCH /api/bookings/:id/accept
 * @desc    Accept a booking request (mentor owner) — creates the session
 * @access  Mentor
 */
router.patch(
  '/:id/accept',
  authorize('MENTOR'),
  bookingController.acceptRequest.bind(bookingController),
);

/**
 * @route   PATCH /api/bookings/:id/reject
 * @desc    Reject a booking request (mentor owner)
 * @access  Mentor
 */
router.patch(
  '/:id/reject',
  authorize('MENTOR'),
  validate(rejectBookingSchema),
  bookingController.rejectRequest.bind(bookingController),
);

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @desc    Cancel a pending booking request (learner owner)
 * @access  Learner
 */
router.patch(
  '/:id/cancel',
  authorize('LEARNER'),
  bookingController.cancelRequest.bind(bookingController),
);

export default router;
