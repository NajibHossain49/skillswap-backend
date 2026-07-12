import { Router, Request, Response, NextFunction } from 'express';
import { verifyCronSecret } from '../../middleware/cronAuth';
import { sendSuccess } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';
import { isJobName, runJob } from '../../jobs';

const router = Router();

const handleCron = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = req.params.job as string;
    if (!isJobName(job)) {
      throw new NotFoundError(`Unknown job: ${job}`);
    }
    const result = await runJob(job);
    sendSuccess(res, result, `Job "${job}" executed`);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST|GET /api/internal/cron/:job
 * @desc    Invoke a scheduled job. Protected by the x-cron-secret header (or a
 *          Bearer token) so only Vercel Cron / trusted callers can trigger it.
 * @access  Cron secret
 */
router.post('/cron/:job', verifyCronSecret, handleCron);
// Vercel Cron issues GET requests, so accept both verbs.
router.get('/cron/:job', verifyCronSecret, handleCron);

export default router;
