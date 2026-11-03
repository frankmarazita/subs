import * as Sentry from '@sentry/nestjs';

// Must be imported before any other module so Sentry can instrument them.
// Sentry stays disabled when SENTRY_DSN is unset (e.g. local development).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
});
