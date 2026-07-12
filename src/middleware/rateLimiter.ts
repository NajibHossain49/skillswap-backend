import { rateLimit, Options, Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';
import { Redis } from '@upstash/redis';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';
import { config } from '../config';
import { logger } from '../utils/logger';

const createLimitHandler =
  (message: string) =>
  (_req: Request, res: Response, _next: unknown, options: Options): Response =>
    sendError(res, message, options.statusCode);

// Lets integration tests exercise the DB-backed account lockout deterministically
// without tripping the IP rate limiter first. Never enabled in normal runs.
const skip = (): boolean => process.env.DISABLE_RATE_LIMIT === 'true';

// A single shared Upstash client for every limiter. Undefined when Redis is not
// configured (local dev), in which case limiters fall back to MemoryStore.
let redisClient: Redis | undefined;

function getRedisClient(): Redis | undefined {
  if (redisClient) return redisClient;
  const { url, token } = config.redis;
  if (!url || !token) return undefined;
  redisClient = new Redis({ url, token });
  return redisClient;
}

/**
 * `rate-limit-redis` talks to Redis with a handful of raw commands
 * (`SCRIPT LOAD`, `EVALSHA`, `DECR`, `DEL`). `@upstash/redis` is a REST client
 * that exposes typed helpers instead of a generic `sendCommand`, so translate
 * that small command set into the corresponding Upstash calls.
 */
function upstashSendCommand(
  client: Redis,
): (...args: string[]) => Promise<RedisReply> {
  return async (...args: string[]): Promise<RedisReply> => {
    const [command = '', ...rest] = args;
    switch (command.toUpperCase()) {
      case 'SCRIPT': {
        if ((rest[0] ?? '').toUpperCase() === 'LOAD') {
          return client.scriptLoad(rest[1] ?? '');
        }
        throw new Error(`Unsupported SCRIPT subcommand: ${rest[0]}`);
      }
      case 'EVALSHA': {
        const [sha = '', numKeysStr = '0', ...tail] = rest;
        const numKeys = Number.parseInt(numKeysStr, 10);
        const keys = tail.slice(0, numKeys);
        const scriptArgs = tail.slice(numKeys);
        return (await client.evalsha(sha, keys, scriptArgs)) as RedisReply;
      }
      case 'DECR':
        return client.decr(rest[0] ?? '');
      case 'DEL':
        return client.del(...rest);
      default:
        throw new Error(`Unsupported Redis command for the Upstash store: ${command}`);
    }
  };
}

// Build a distributed store when Redis is configured; otherwise return undefined
// so express-rate-limit uses its default in-memory store. Each limiter gets its
// own key prefix so their counters never collide in a shared Redis instance.
function createStore(prefix: string): Store | undefined {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({ prefix, sendCommand: upstashSendCommand(client) });
}

// Fail loud (but don't crash) if we boot into production without a shared store:
// on Vercel/serverless the in-memory counters reset every invocation, which
// silently disables brute-force protection.
if (config.env === 'production' && !getRedisClient()) {
  logger.warn({
    msg:
      'Rate limiting is falling back to the in-memory store in production. ' +
      'On serverless/multi-instance deployments counters are not shared, so ' +
      'brute-force protection is effectively disabled. Set ' +
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
  });
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  store: createStore('rl:global:'),
  handler: createLimitHandler('Too many requests, please try again later'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  store: createStore('rl:auth:'),
  handler: createLimitHandler('Too many authentication attempts, please try again later'),
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  store: createStore('rl:pwreset:'),
  handler: createLimitHandler('Too many password reset requests, please try again later'),
});
