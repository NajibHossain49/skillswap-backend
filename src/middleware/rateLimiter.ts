import { rateLimit, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';

const createLimitHandler =
  (message: string) =>
  (_req: Request, res: Response, _next: unknown, options: Options): Response =>
    sendError(res, message, options.statusCode);

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createLimitHandler('Too many requests, please try again later'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createLimitHandler('Too many authentication attempts, please try again later'),
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createLimitHandler('Too many password reset requests, please try again later'),
});
