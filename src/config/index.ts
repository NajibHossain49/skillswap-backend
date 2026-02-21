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
} as const;
