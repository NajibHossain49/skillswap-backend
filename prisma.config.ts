import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Root Prisma config, auto-discovered by every `prisma` invocation (generate,
// migrate deploy, studio, ...). In Prisma 7 connection URLs live here, not in
// schema.prisma.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/prisma/seed.ts',
  },
  datasource: {
    // The CLI/Migrate connection. Use the DIRECT (non-pooled) Neon endpoint for
    // migrations — they can't run through the pooler/PgBouncer. Falls back to
    // DATABASE_URL locally where there is no separate pooler host. Runtime
    // queries do NOT use this; they go through the PrismaPg adapter in
    // src/prisma/client.ts with the pooled DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
