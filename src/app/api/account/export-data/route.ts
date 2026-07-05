import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import { requireSession } from "@/lib/auth/session";
import { AuthRateLimitError, enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import {
  buildExportFilename,
  buildUserDataExport,
  type UserDataExportStore,
} from "@/lib/privacy/export-user-data";
import {
  getUserPasswordPresent,
  prismaUserDataExportStore,
} from "@/lib/privacy/export-user-data-store";
import {
  AccountPasswordVerificationError,
  verifyAccountPassword,
} from "@/lib/privacy/verify-account-password";
import type { SessionUser } from "@/types";

type ExportDataRouteDependencies = {
  requireSessionFn?: () => Promise<SessionUser>;
  enforceRateLimit?: typeof enforceAuthRateLimit;
  verifyPassword?: typeof verifyAccountPassword;
  getPasswordPresent?: (userId: string) => Promise<boolean>;
  buildExport?: typeof buildUserDataExport;
  store?: UserDataExportStore;
};

export async function postAccountExportData(
  request: Request,
  dependencies: ExportDataRouteDependencies = {},
) {
  const requireSessionFn = dependencies.requireSessionFn ?? requireSession;
  const enforceRateLimit = dependencies.enforceRateLimit ?? enforceAuthRateLimit;
  const verifyPassword = dependencies.verifyPassword ?? verifyAccountPassword;
  const getPasswordPresent =
    dependencies.getPasswordPresent ?? getUserPasswordPresent;
  const buildExport = dependencies.buildExport ?? buildUserDataExport;
  const store = dependencies.store ?? prismaUserDataExportStore;

  try {
    const session = await requireSessionFn();

    await enforceRateLimit({
      action: "export_data",
      request,
      email: session.email,
    });

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : undefined;

    await verifyPassword(session.id, password);

    const userPasswordPresent = await getPasswordPresent(session.id);
    const exportedAt = new Date();
    const exportData = await buildExport(session.id, store, {
      exportedAt,
      userPasswordPresent,
    });

    const filename = buildExportFilename(exportedAt);
    const json = JSON.stringify(exportData, null, 2);

    return new Response(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_GENERIC_MESSAGE },
        { status: 429 },
      );
    }

    if (error instanceof AccountPasswordVerificationError) {
      if (error.code === "password_not_supported") {
        return NextResponse.json(
          {
            error:
              "Password verification is not available for this account. Contact support to request a data export.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Invalid password" },
        { status: 403 },
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[export-data] request failed");
    return NextResponse.json(
      { error: "Failed to export account data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return postAccountExportData(request);
}