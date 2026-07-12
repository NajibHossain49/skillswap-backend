import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../../prisma/client';

// Integration tests run against a REAL database (no Prisma mock). They are gated
// by RUN_INTEGRATION so the default `vitest run` never touches a database.
beforeAll(async () => {
  if (!process.env.RUN_INTEGRATION) return;
  // Fail fast with a clear message if the DB is unreachable.
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
