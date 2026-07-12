import { defineConfig } from 'vitest/config';

// Integration tests run against a REAL database and the real Prisma client — no
// mock setup file. They are gated by RUN_INTEGRATION (see helpers) and run
// sequentially since they share one database.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/integration/**/*.test.ts'],
    setupFiles: ['./src/tests/integration/env.ts', './src/tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
