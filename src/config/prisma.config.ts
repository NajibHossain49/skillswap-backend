import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // paths are relative to this config file, which lives in src/config
  schema: '../../prisma/schema.prisma',
  migrations: {
    path: '../../prisma/migrations',
    seed: 'ts-node ../../prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
