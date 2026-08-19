import * as Sentry from "@sentry/nextjs";

// The proxy (middleware) runs on the edge runtime and needs its own client.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.VERCEL_ENV ?? "development",
});
