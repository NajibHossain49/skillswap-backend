import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const connectionString = `${process.env.DATABASE_URL}`;

// On serverless (Vercel) a fresh module evaluation would otherwise create a new
// PrismaClient — and therefore a new connection pool — on every cold start, and
// hot lambdas that re-import the module would stack more pools on top. Neon's
// pooler has a hard connection ceiling, so we cache a single client on
// globalThis and reuse it across invocations within the same warm lambda.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// `max: 1` keeps each lambda to a single upstream connection; combine with the
// `-pooler` Neon host + `connection_limit=1` in DATABASE_URL so many concurrent
// lambdas don't exhaust the database.
const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg({ connectionString, max: 1 });
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Only cache on globalThis outside production. In dev/test this prevents tsx
// hot-reload from leaking clients; in production each lambda is short-lived and
// we intentionally let it be garbage-collected with the instance. We do NOT call
// prisma.$connect() at module scope — the pool connects lazily on first query,
// which keeps cold starts fast and avoids opening connections on unused lambdas.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
