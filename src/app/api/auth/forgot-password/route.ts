import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  requestPasswordResetForEmail,
} from "@/lib/auth/password-reset";
import { prismaPasswordResetStore } from "@/lib/auth/password-reset-store";
import { AuthRateLimitError, enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";

    await enforceAuthRateLimit({
      action: "forgot_password",
      request,
      email,
    });

    const resetRequest = await requestPasswordResetForEmail(
      email,
      prismaPasswordResetStore,
    );

    if (resetRequest) {
      await sendPasswordResetEmail({
        email: resetRequest.email,
        plainToken: resetRequest.plainToken,
      });
    }

    return NextResponse.json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_GENERIC_MESSAGE },
        { status: 429 },
      );
    }

    console.error("[forgot-password] request failed");
    return NextResponse.json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
  }
}