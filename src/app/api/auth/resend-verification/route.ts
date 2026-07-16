import { NextResponse } from "next/server";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";
import {
  EMAIL_VERIFICATION_ALREADY_VERIFIED_MESSAGE,
  EMAIL_VERIFICATION_RESEND_SUCCESS_MESSAGE,
  EmailVerificationError,
  resendEmailVerificationForUser,
} from "@/lib/auth/email-verification";
import { prismaEmailVerificationStore } from "@/lib/auth/email-verification-store";
import {
  AuthRateLimitError,
  AuthRateLimitUnavailableError,
  AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE,
  enforceAuthRateLimit,
} from "@/lib/auth/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { sendEmailVerificationEmail } from "@/lib/email/send-email-verification";

type ResendVerificationDependencies = {
  getSession?: typeof requireSession;
  enforceRateLimit?: typeof enforceAuthRateLimit;
  resend?: typeof resendEmailVerificationForUser;
  sendEmail?: typeof sendEmailVerificationEmail;
};

export async function postResendVerification(
  request: Request,
  dependencies: ResendVerificationDependencies = {},
) {
  const getSession = dependencies.getSession ?? requireSession;
  const enforceRateLimit =
    dependencies.enforceRateLimit ?? enforceAuthRateLimit;
  const resend = dependencies.resend ?? resendEmailVerificationForUser;
  const sendEmail = dependencies.sendEmail ?? sendEmailVerificationEmail;

  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await enforceRateLimit({
      action: "resend_verification",
      request,
      email: session.email,
    });

    const result = await resend(session.id, prismaEmailVerificationStore);

    if (result.status === "already_verified") {
      return NextResponse.json({
        message: EMAIL_VERIFICATION_ALREADY_VERIFIED_MESSAGE,
        alreadyVerified: true,
      });
    }

    await sendEmail({
      email: result.email,
      name: result.name,
      plainToken: result.plainToken,
    });

    return NextResponse.json({
      message: EMAIL_VERIFICATION_RESEND_SUCCESS_MESSAGE,
      alreadyVerified: false,
    });
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

    if (error instanceof EmailVerificationError) {
      if (error.code === "user_not_found") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.error("[resend-verification] request failed");
    // Generic success-style response to avoid leaking account state on unexpected errors.
    return NextResponse.json({
      message: EMAIL_VERIFICATION_RESEND_SUCCESS_MESSAGE,
      alreadyVerified: false,
    });
  }
}

export async function POST(request: Request) {
  return postResendVerification(request);
}
