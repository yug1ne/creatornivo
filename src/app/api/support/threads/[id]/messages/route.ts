import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import {
  AuthRateLimitError,
  AuthRateLimitUnavailableError,
  AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE,
  enforceAuthRateLimit,
} from "@/lib/auth/rate-limit";
import { requireSession } from "@/lib/auth/session";
import {
  replyToUserSupportThread,
  SupportAccessError,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";
import {
  SupportValidationError,
  supportValidationMessage,
} from "@/lib/support/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await enforceAuthRateLimit({
      action: "support_reply",
      request,
      email: session.email,
    });

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      body?: unknown;
      senderType?: unknown;
    };

    const created = await replyToUserSupportThread(
      {
        userId: session.id,
        threadId: id,
        body: body.body,
        attemptedSenderType:
          typeof body.senderType === "string" ? body.senderType : null,
      },
      prismaSupportStore,
    );

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_GENERIC_MESSAGE },
        { status: 429 },
      );
    }
    if (error instanceof SupportValidationError) {
      return NextResponse.json(
        { error: supportValidationMessage(error.code) },
        { status: 400 },
      );
    }
    if (error instanceof SupportAccessError) {
      if (error.code === "not_found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (error.code === "closed") {
        return NextResponse.json(
          {
            error:
              "This request is closed. Start a new support request if you still need help.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("[support] reply failed");
    return NextResponse.json({ error: "Could not send reply" }, { status: 500 });
  }
}
