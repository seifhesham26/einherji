import * as Sentry from "@sentry/nextjs";

// No DSN means Sentry initialises into a no-op. That's deliberate: the app has to
// run locally and for anyone who hasn't signed up, without a stub or a branch at
// every call site.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // The daily cron is the reason this exists — it runs unattended, so a broken
  // source would otherwise fail silently for weeks. Sampling is off; the volume
  // here is a handful of runs a day, and losing one to sampling defeats the point.
  tracesSampleRate: 0,
  // Scrape failures are expected and already reported in the run summary. Sending
  // them to Sentry as well turns a working feature into noise.
  ignoreErrors: ["ScrapeError", "CircuitOpenError"],
  environment: process.env.VERCEL_ENV ?? "development",
});
