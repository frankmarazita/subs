import * as Sentry from '@sentry/nestjs';

// Imported first in main.ts so Sentry can instrument everything loaded after it.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    environment: process.env.ENVIRONMENT ?? 'production',
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}
