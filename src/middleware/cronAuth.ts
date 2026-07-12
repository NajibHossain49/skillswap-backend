import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

/**
 * Constant-time check of the cron shared secret. Accepts the secret either in the
 * `x-cron-secret` header or as `Authorization: Bearer <secret>` (the header
 * Vercel Cron sends automatically), compared against `CRON_SECRET` with
 * `crypto.timingSafeEqual` so it cannot be brute-forced via timing.
 */
export const verifyCronSecret = (req: Request, _res: Response, next: NextFunction): void => {
  const secret = config.cronSecret;
  if (!secret) {
    return next(new UnauthorizedError('Cron endpoint is not configured'));
  }

  const headerSecret = req.header('x-cron-secret');
  const bearer = req.header('authorization');
  const provided =
    headerSecret ?? (bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : '');

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new UnauthorizedError('Invalid cron secret'));
  }

  next();
};
