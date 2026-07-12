// Runs FIRST (before any module that reads config/env). Must not import anything
// that reads process.env at import time, so env is set before the app loads.
process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';
// Integration tests hit a REAL Postgres. Prefer a dedicated TEST_DATABASE_URL
// (see the `db-test` service in docker-compose.yml) so the suite never runs
// against the primary DATABASE_URL; fall back to DATABASE_URL when unset.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.CRON_SECRET = process.env.CRON_SECRET ?? 'integration_cron_secret';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_minimum_32_chars_long_xyz';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_minimum_32_chars_long_xyz';
