// Client-side Sentry init (browser). Loaded automatically by Next.js App Router.
// Session Replay and Profiling are intentionally disabled to conserve quota.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Performance tracing only — no replay/profiling
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    // Keep default dataCollection (no PII / HTTP bodies unless explicitly enabled)
  });
}

// App Router navigation spans
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;