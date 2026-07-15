import { NextResponse } from "next/server";

import { isAuthRateLimitEnabled } from "@/config/auth-rate-limit";
import { prisma } from "@/lib/db";

import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "degraded";

/** Lightweight DB probe — no table scans, safe for frequent monitoring polls. */
async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[health] database check failed:", error);
    return false;
  }
}

/**
 * Public health check for uptime monitors (Vercel, Sentry, external ping).
 * No authentication — must stay fast and leak no sensitive data.
 *
 * `authRateLimit` is a read-only config signal (configured | not_configured).
 * It does not change overall status — missing Redis should not page uptime monitors.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const databaseOk = await checkDatabase();
  const authRateLimitConfigured = isAuthRateLimitEnabled();

  const status: HealthStatus = databaseOk ? "ok" : "degraded";
  const httpStatus = databaseOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp,
      version: packageJson.version,
      checks: {
        database: databaseOk ? "ok" : "unavailable",
        authRateLimit: authRateLimitConfigured
          ? "configured"
          : "not_configured",
      },
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}