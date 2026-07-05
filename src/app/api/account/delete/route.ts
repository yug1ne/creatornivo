import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import { requireSession } from "@/lib/auth/session";
import { AuthRateLimitError, enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import { getRateLimitClientKey } from "@/lib/auth/request";
import { prismaAccountDeletionAuditStore } from "@/lib/privacy/account-deletion-store";
import { prismaAccountDeletionDataStore } from "@/lib/privacy/account-deletion-store";
import {
  AccountDeletionError,
  deleteUserAccount,
} from "@/lib/privacy/delete-user-account";
import type { SessionUser } from "@/types";

type DeleteAccountRouteDependencies = {
  requireSessionFn?: () => Promise<SessionUser>;
  enforceRateLimit?: typeof enforceAuthRateLimit;
  deleteAccount?: typeof deleteUserAccount;
};

export async function postAccountDelete(
  request: Request,
  dependencies: DeleteAccountRouteDependencies = {},
) {
  const requireSessionFn = dependencies.requireSessionFn ?? requireSession;
  const enforceRateLimit = dependencies.enforceRateLimit ?? enforceAuthRateLimit;
  const deleteAccount = dependencies.deleteAccount ?? deleteUserAccount;

  try {
    const session = await requireSessionFn();

    await enforceRateLimit({
      action: "delete_account",
      request,
      email: session.email,
    });

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : undefined;
    const confirmation =
      typeof body.confirmation === "string" ? body.confirmation : undefined;

    await deleteAccount(
      {
        userId: session.id,
        password,
        confirmation,
        ipKey: getRateLimitClientKey(request),
      },
      {
        dataStore: prismaAccountDeletionDataStore,
        auditStore: prismaAccountDeletionAuditStore,
      },
    );

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_GENERIC_MESSAGE },
        { status: 429 },
      );
    }

    if (error instanceof AccountDeletionError) {
      const status =
        error.code === "subscription_active" ||
        error.code === "subscription_requires_action" ||
        error.code === "generation_in_progress"
          ? 409
          : 403;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          manageSubscription: error.manageSubscription,
        },
        { status },
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[delete-account] request failed");
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return postAccountDelete(request);
}