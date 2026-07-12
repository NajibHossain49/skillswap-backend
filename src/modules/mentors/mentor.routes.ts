import { Router } from 'express';
import { mentorController } from './mentor.controller';
import { validateQuery } from '../../middleware/validate';
import { mentorQuerySchema, mentorReviewsQuerySchema } from './mentor.schema';

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
