import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const REDACTED = '[REDACTED]';
const REDACTED_QUERY_KEYS = ['token', 'password'];

const redactUrl = (originalUrl: string): string => {
  const queryIndex = originalUrl.indexOf('?');
  if (queryIndex === -1) {
    return originalUrl;
  }

  const path = originalUrl.slice(0, queryIndex);
  const params = new URLSearchParams(originalUrl.slice(queryIndex + 1));

  for (const key of REDACTED_QUERY_KEYS) {
    if (params.has(key)) {
      params.set(key, REDACTED);
    }
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      msg: 'Request completed',
      requestId: req.id,
      method: req.method,
      url: redactUrl(req.originalUrl),
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      authorization: req.headers.authorization ? REDACTED : undefined,
      ip: req.ip,
    });
  });

  next();
};
