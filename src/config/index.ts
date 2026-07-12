import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
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
