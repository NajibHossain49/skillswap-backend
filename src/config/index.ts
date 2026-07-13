import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Non-pooled Postgres endpoint used only by `prisma migrate deploy` (migrations
  // cannot run through the connection pooler). Optional at runtime; required for
  // migrations. On Neon this is the host WITHOUT "-pooler".
  DIRECT_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  // Upstash Redis (REST) — backs the distributed rate limiter. Optional so local
  // dev falls back to an in-memory store; required for serverless (Vercel) where
  // in-memory counters are not shared across invocations.
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  APP_URL: z.string().default('http://localhost:3001'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  // Shared secret required to invoke the internal cron endpoints (Vercel Cron).
  CRON_SECRET: z.string().optional(),
  // Run node-cron in this process. Enabled by default outside production; on
  // serverless (Vercel) leave this off and drive jobs via the HTTP endpoints.
  ENABLE_CRON: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  // Expose Swagger UI. Always on in dev; in production requires this flag.
  ENABLE_DOCS: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  // Optional HTTP Basic Auth for the docs in production.
  DOCS_USER: z.string().optional(),
  DOCS_PASSWORD: z.string().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parseResult.data.NODE_ENV,
  port: parseInt(parseResult.data.PORT, 10),
  database: {
    url: parseResult.data.DATABASE_URL,
    // Migrations use the direct (non-pooled) endpoint; locally there is usually
    // no separate host, so fall back to DATABASE_URL when DIRECT_URL is unset.
    directUrl: parseResult.data.DIRECT_URL ?? parseResult.data.DATABASE_URL,
  },
  jwt: {
    accessSecret: parseResult.data.JWT_ACCESS_SECRET,
    refreshSecret: parseResult.data.JWT_REFRESH_SECRET,
    accessExpiresIn: parseResult.data.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parseResult.data.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    origin: parseResult.data.CORS_ORIGIN,
  },
  redis: {
    url: parseResult.data.UPSTASH_REDIS_REST_URL,
    token: parseResult.data.UPSTASH_REDIS_REST_TOKEN,
  },
  email: {
    resendApiKey: parseResult.data.RESEND_API_KEY,
    from: parseResult.data.EMAIL_FROM,
  },
  appUrl: parseResult.data.APP_URL,
  bcryptRounds: parseResult.data.BCRYPT_ROUNDS,
  cronSecret: parseResult.data.CRON_SECRET,
  // node-cron runs in-process everywhere except production unless explicitly enabled.
  enableCron: parseResult.data.ENABLE_CRON ?? parseResult.data.NODE_ENV !== 'production',
  docs: {
    // Docs are open in non-production; production requires ENABLE_DOCS=true.
    enabled: parseResult.data.ENABLE_DOCS ?? parseResult.data.NODE_ENV !== 'production',
    user: parseResult.data.DOCS_USER,
    password: parseResult.data.DOCS_PASSWORD,
  },
} as const;

/**
 * Fail fast at boot on insecure production configuration. These are all things
 * that would otherwise "work" (the server starts) but leave the deployment
 * silently broken or unsafe — the worst kind of bug. We collect every problem
 * and throw a single actionable error so an operator can fix them all at once.
 */
function assertProductionConfig(): void {
  if (config.env !== 'production') return;

  const errors: string[] = [];

  // CORS: a wildcard or localhost origin in production means the API trusts any
  // site (or a dev host) — combined with `credentials: true` this is unsafe.
  const corsOrigin = config.cors.origin?.trim();
  if (!corsOrigin || corsOrigin === '*') {
    errors.push(
      'CORS_ORIGIN must be set to your explicit frontend origin(s) in production ' +
        '(it is unset or "*"). Example: CORS_ORIGIN=https://app.skillswap.com',
    );
  } else if (/localhost/i.test(corsOrigin)) {
    errors.push(
      `CORS_ORIGIN still contains "localhost" (got "${corsOrigin}"). Set it to the ` +
        'deployed frontend origin(s) instead.',
    );
  }

  // APP_URL is embedded in verification/reset/notification email links. A missing
  // or localhost value ships dead links to real users. It defaults to a localhost
  // URL, so an unset value trips the localhost check below.
  const appUrl = config.appUrl?.trim();
  if (!appUrl || /localhost/i.test(appUrl)) {
    errors.push(
      `APP_URL must be your deployed frontend URL in production (got "${appUrl || '(unset)'}"). ` +
        'It builds the links in verification, password-reset, and notification emails.',
    );
  }

  // Cron endpoints are unauthenticated without this shared secret.
  if (!config.cronSecret) {
    errors.push(
      'CRON_SECRET is required in production — it protects POST /api/internal/cron/:job. ' +
        'Generate a strong random value and set it in the Vercel project and the ' +
        'external cron GitHub secret.',
    );
  }

  // Without a shared Redis store the rate limiters fall back to a per-lambda
  // in-memory store, which resets every invocation → no real rate limiting.
  if (!config.redis.url || !config.redis.token) {
    errors.push(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. ' +
        'Without them the rate limiters silently fall back to a per-lambda in-memory ' +
        'store, disabling rate limiting on serverless.',
    );
  }

  // Neon's pooled endpoint (host contains "-pooler") is required at runtime so
  // many concurrent lambdas don't exhaust the direct connection limit.
  if (!config.database.url.includes('-pooler')) {
    errors.push(
      'DATABASE_URL must point at the Neon POOLED endpoint (its host contains ' +
        '"-pooler") in production, e.g. ' +
        '...-pooler.<region>.neon.tech/...?sslmode=require&connection_limit=1. ' +
        'Use the non-pooled endpoint for DIRECT_URL (migrations) only.',
    );
  }

  if (errors.length > 0) {
    throw new Error(
      'Unsafe production configuration — refusing to start:\n' +
        errors.map((e) => `  • ${e}`).join('\n'),
    );
  }
}

assertProductionConfig();
