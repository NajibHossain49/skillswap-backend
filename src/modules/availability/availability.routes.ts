import { Router } from 'express';
import { availabilityController } from './availability.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  slotsQuerySchema,
} from './availability.schema';

const router = Router();

/**
 * @route   GET /api/availability/me
 * @desc    Get the logged-in mentor's availability rules
 * @access  Mentor
 */
router.get(
  '/me',
  authenticate,
  authorize('MENTOR'),
  availabilityController.getMyAvailability.bind(availabilityController),
);

/**
 * @route   POST /api/availability
 * @desc    Create an availability slot (rejects overlaps on the same day)
 * @access  Mentor
 */
router.post(
  '/',
  authenticate,
  authorize('MENTOR'),
  validate(createAvailabilitySchema),
  availabilityController.createAvailability.bind(availabilityController),
);

/**
 * @route   PATCH /api/availability/:id
 * @desc    Update an availability slot (owner only)
 * @access  Mentor
 */
router.patch(
  '/:id',
  authenticate,
  authorize('MENTOR'),
  validate(updateAvailabilitySchema),
  availabilityController.updateAvailability.bind(availabilityController),
);

/**
 * @route   DELETE /api/availability/:id
 * @desc    Delete an availability slot (owner only)
 * @access  Mentor
 */
router.delete(
  '/:id',
  authenticate,
  authorize('MENTOR'),
  availabilityController.deleteAvailability.bind(availabilityController),
);

/**
 * @route   GET /api/availability/mentor/:mentorId/slots?date=YYYY-MM-DD
 * @desc    Concrete bookable slots for a mentor on a given date
 * @access  Public
 */
router.get(
  '/mentor/:mentorId/slots',
  validateQuery(slotsQuerySchema),
  availabilityController.getMentorSlots.bind(availabilityController),
);

/**
 * @route   GET /api/availability/mentor/:mentorId
 * @desc    A mentor's weekly availability rules
 * @access  Public
 */
router.get(
  '/mentor/:mentorId',
  availabilityController.getMentorAvailability.bind(availabilityController),
);

export default router;
