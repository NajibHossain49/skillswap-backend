// Runs FIRST (before any module that reads config/env). Must not import anything
// that reads process.env at import time, so env is set before the app loads.
// DATABASE_URL is intentionally left to .env so integration tests hit a real DB.
process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.CRON_SECRET = process.env.CRON_SECRET ?? 'integration_cron_secret';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_minimum_32_chars_long_xyz';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_minimum_32_chars_long_xyz';
