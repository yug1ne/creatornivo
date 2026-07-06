// Next.js instrumentation hook — registers Sentry per runtime (nodejs / edge).
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures unhandled server request errors (@sentry/nextjs >= 8.28)
export const onRequestError = Sentry.captureRequestError;