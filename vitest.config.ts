import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration tests use a real DB + real Prisma client and run via
    // vitest.integration.config.ts. Keep them out of the default (mocked) run.
    exclude: [...configDefaults.exclude, 'src/tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/prisma/**', 'src/server.ts', 'src/tests/integration/**'],
    },
    setupFiles: ['./src/tests/setup.ts'],
  },
});
