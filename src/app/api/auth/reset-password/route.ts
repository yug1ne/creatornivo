import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import {
  PasswordResetError,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset";
import { prismaPasswordResetStore } from "@/lib/auth/password-reset-store";
import {
  AuthRateLimitError,
  AuthRateLimitUnavailableError,
  AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE,
  enforceAuthRateLimit,
} from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  try {
    await enforceAuthRateLimit({
      action: "reset_password",
      request,
    });

    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;

    await resetPasswordWithToken(
      { token, password },
      prismaPasswordResetStore,
      {
        hashPassword: (plainPassword) => bcrypt.hash(plainPassword, 12),
      },
    );

    return NextResponse.json({ message: "Password reset successful" });
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

    if (error instanceof PasswordResetError) {
      if (error.code === "password_too_short") {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 },
      );
    }

    console.error("[reset-password] request failed");
    return NextResponse.json(
      { error: "Password reset failed" },
      { status: 500 },
    );
  }
}