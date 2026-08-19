import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

// Source maps are only uploaded when the credentials exist. Without them the
// wrapper still works — errors report with minified stacks rather than failing
// the build, which matters because most builds here run without a Sentry account.
const hasSentryUploadCredentials = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: { disable: !hasSentryUploadCredentials },
  // Routes browser error reports through our own domain, so ad blockers don't
  // swallow them.
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
