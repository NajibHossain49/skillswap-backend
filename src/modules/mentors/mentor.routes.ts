import { Router } from 'express';
import { mentorController } from './mentor.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { mentorQuerySchema, mentorReviewsQuerySchema, applyMentorSchema } from './mentor.schema';

const router = Router();

/**
 * @route   GET /api/mentors
 * @desc    Public mentor discovery (filter, search, sort)
 * @access  Public
 */
router.get(
  '/',
  validateQuery(mentorQuerySchema),
  mentorController.getMentors.bind(mentorController),
);

/**
 * @route   POST /api/mentors/apply
 * @desc    Apply to become a mentor (sets mentorStatus = PENDING)
 * @access  Private
 */
router.post(
  '/apply',
  authenticate,
  validate(applyMentorSchema),
  mentorController.apply.bind(mentorController),
);

/**
 * @route   GET /api/mentors/:id
 * @desc    Public mentor profile + recent reviews
 * @access  Public
 */
router.get('/:id', mentorController.getMentorById.bind(mentorController));

/**
 * @route   GET /api/mentors/:id/reviews
 * @desc    Paginated reviews for a mentor
 * @access  Public
 */
router.get(
  '/:id/reviews',
  validateQuery(mentorReviewsQuerySchema),
  mentorController.getMentorReviews.bind(mentorController),
);

export default router;
