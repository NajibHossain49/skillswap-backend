import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { cleanupExpiredTokens } from './cleanupExpiredTokens';
import { sessionReminders } from './sessionReminders';
import { autoCompleteSessions } from './autoCompleteSessions';
import { expireStaleBookings } from './expireStaleBookings';

export type JobName =
  | 'cleanupExpiredTokens'
  | 'sessionReminders'
  | 'autoCompleteSessions'
  | 'expireStaleBookings';

type JobRunner = () => Promise<Record<string, unknown>>;

// Every job is a plain async function returning a summary, so it can be invoked
// identically by node-cron (local) or the internal HTTP endpoint (Vercel Cron).
export const jobs: Record<JobName, JobRunner> = {
  cleanupExpiredTokens,
  sessionReminders,
  autoCompleteSessions,
  expireStaleBookings,
};

export const isJobName = (name: string): name is JobName =>
  Object.prototype.hasOwnProperty.call(jobs, name);

export async function runJob(name: JobName): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
  logger.info({ msg: `Running job: ${name}` });
  const result = await jobs[name]();
  logger.info({ msg: `Job complete: ${name}`, durationMs: Date.now() - startedAt, result });
  return result;
}

// Cron expressions kept alongside the runners; the HTTP schedule in vercel.json
// mirrors these for production.
export const jobSchedule: Record<JobName, string> = {
  cleanupExpiredTokens: '0 3 * * *', // daily at 03:00
  sessionReminders: '*/15 * * * *', // every 15 minutes
  autoCompleteSessions: '0 * * * *', // hourly
  expireStaleBookings: '0 * * * *', // hourly
};

/**
 * Register in-process cron schedules. Used for local/single-instance runs; on
 * serverless the jobs are driven via POST /api/internal/cron/:job instead, so
 * this should stay disabled there (config.enableCron === false).
 */
export function startScheduledJobs(): void {
  // Only run the in-process node-cron scheduler as a long-lived process (local
  // dev, Docker). On Vercel (`process.env.VERCEL` is set) the lambda is torn down
  // between requests, so node-cron never fires — jobs are driven over HTTP via
  // POST /api/internal/cron/:job instead. Tests never schedule background timers.
  if (process.env.VERCEL || config.env === 'test') {
    logger.info({
      msg: 'In-process cron scheduler disabled (serverless/test); jobs run via HTTP',
    });
    return;
  }

  for (const name of Object.keys(jobSchedule) as JobName[]) {
    cron.schedule(jobSchedule[name], () => {
      runJob(name).catch((err) => logger.error({ msg: `Scheduled job failed: ${name}`, err }));
    });
  }
  logger.info({ msg: 'In-process cron jobs registered', jobs: Object.keys(jobSchedule) });
}
