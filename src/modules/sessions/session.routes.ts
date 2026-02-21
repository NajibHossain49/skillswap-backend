import { Router } from 'express';
import { sessionController } from './session.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import {
  createSessionSchema,
  updateSessionStatusSchema,
  sessionQuerySchema,
  createFeedbackSchema,
} from './session.schema';

const router = Router();

// All session routes require auth
router.use(authenticate);

/**
 * @route   GET /api/sessions/stats
 * @desc    Get mentor session stats
 * @access  Mentor
 */
router.get('/stats', authorize('MENTOR', 'ADMIN'), sessionController.getMentorStats.bind(sessionController));

/**
 * @route   GET /api/sessions
 * @desc    Get sessions (filtered by role)
 * @access  Private
 */
router.get(
  '/',
  validateQuery(sessionQuerySchema),
  sessionController.getAllSessions.bind(sessionController),
);

/**
 * @route   POST /api/sessions
 * @desc    Create a session (Mentor)
 * @access  Mentor, Admin
 */
router.post(
  '/',
  authorize('MENTOR', 'ADMIN'),
  validate(createSessionSchema),
  sessionController.createSession.bind(sessionController),
);

/**
 * @route   GET /api/sessions/:id
 * @desc    Get session by ID
 * @access  Private
 */
router.get('/:id', sessionController.getSessionById.bind(sessionController));

/**
 * @route   POST /api/sessions/:id/book
 * @desc    Book a session (Learner)
 * @access  Learner
 */
router.post('/:id/book', authorize('LEARNER'), sessionController.bookSession.bind(sessionController));

/**
 * @route   PATCH /api/sessions/:id/status
 * @desc    Update session status
 * @access  Mentor, Admin, Learner
 */
router.patch(
  '/:id/status',
  validate(updateSessionStatusSchema),
  sessionController.updateSessionStatus.bind(sessionController),
);

/**
 * @route   POST /api/sessions/:id/feedback
 * @desc    Add feedback to completed session
 * @access  Learner
 */
router.post(
  '/:id/feedback',
  authorize('LEARNER'),
  validate(createFeedbackSchema),
  sessionController.addFeedback.bind(sessionController),
);

/**
 * @route   GET /api/sessions/:id/feedback
 * @desc    Get session feedback
 * @access  Private
 */
router.get('/:id/feedback', sessionController.getSessionFeedback.bind(sessionController));

export default router;
