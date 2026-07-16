import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Baseline browser security headers (conservative).
 * No strict CSP yet — would need careful Next/Sentry/Paddle allowlists.
 * X-Frame-Options: DENY blocks clickjacking; Paddle/Stripe use redirects/overlays,
 * not embedding creatornivo.com in a third-party iframe.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
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