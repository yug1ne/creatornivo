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
  createUserSupportThread,
  listUserSupportThreads,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";
import {
  SupportValidationError,
  supportValidationMessage,
} from "@/lib/support/validation";

export async function GET() {
  try {
    const session = await requireSession();
    const threads = await listUserSupportThreads(session.id, prismaSupportStore);
    return NextResponse.json({ threads });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await enforceAuthRateLimit({
      action: "support_create_thread",
      request,
      email: session.email,
    });

    const body = (await request.json().catch(() => ({}))) as {
      subject?: unknown;
      body?: unknown;
      senderType?: unknown;
    };

    // Ignore any client-supplied senderType.
    void body.senderType;

    const created = await createUserSupportThread(
      {
        userId: session.id,
        subject: body.subject,
        body: body.body,
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

    console.error("[support] create thread failed");
    return NextResponse.json(
      { error: "Could not create support request" },
      { status: 500 },
    );
  }
}
