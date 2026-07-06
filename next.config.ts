import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wraps the build to upload source maps for readable stack traces in Sentry.
// Requires SENTRY_AUTH_TOKEN (+ SENTRY_ORG, SENTRY_PROJECT) at build time in CI/Vercel.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload more client files for better browser stack trace resolution
  widenClientFileUpload: true,

  // Proxy route to reduce ad-blocker drops (exclude /monitoring in middleware)
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
});