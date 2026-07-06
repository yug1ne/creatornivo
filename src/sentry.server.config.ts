// Node.js server runtime Sentry init (Server Components, Route Handlers, Server Actions).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    // Helps debug server errors; avoid logging secrets in local variable names
    includeLocalVariables: true,
  });
}