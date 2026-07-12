import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { audit } from '../../middleware/auditLog';
import { createReportSchema, reportQuerySchema, resolveReportSchema } from './report.schema';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/reports
 * @desc    File a report against a user, session, or skill
 * @access  Private
 */
router.post('/', validate(createReportSchema), reportController.createReport.bind(reportController));

/**
 * @route   GET /api/reports
 * @desc    List reports (Admin)
 * @access  Admin
 */
router.get(
  '/',
  authorize('ADMIN'),
  validateQuery(reportQuerySchema),
  reportController.getReports.bind(reportController),
);

/**
 * @route   GET /api/reports/:id
 * @desc    Get a single report (Admin)
 * @access  Admin
 */
router.get('/:id', authorize('ADMIN'), reportController.getReportById.bind(reportController));

/**
 * @route   PATCH /api/reports/:id/resolve
 * @desc    Update a report's status / add an admin note (Admin)
 * @access  Admin
 */
router.patch(
  '/:id/resolve',
  authorize('ADMIN'),
  validate(resolveReportSchema),
  audit('report.resolve', 'Report'),
  reportController.resolveReport.bind(reportController),
);

export default router;
