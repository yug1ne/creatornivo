import { NextResponse } from "next/server";

import {
  EMAIL_VERIFICATION_INVALID_MESSAGE,
  EMAIL_VERIFICATION_SUCCESS_MESSAGE,
  EmailVerificationError,
  verifyEmailWithToken,
} from "@/lib/auth/email-verification";
import { prismaEmailVerificationStore } from "@/lib/auth/email-verification-store";

type VerifyEmailRouteDependencies = {
  verify?: typeof verifyEmailWithToken;
};

export async function postVerifyEmail(
  request: Request,
  dependencies: VerifyEmailRouteDependencies = {},
) {
  const verify = dependencies.verify ?? verifyEmailWithToken;

  try {
    const body = (await request.json()) as { token?: string };
    const result = await verify(body.token, prismaEmailVerificationStore);

    return NextResponse.json({
      message: result.alreadyVerified
        ? EMAIL_VERIFICATION_SUCCESS_MESSAGE
        : EMAIL_VERIFICATION_SUCCESS_MESSAGE,
      alreadyVerified: result.alreadyVerified,
    });
  } catch (error) {
    if (error instanceof EmailVerificationError) {
      if (error.code === "missing_token") {
        return NextResponse.json(
          { error: "A verification token is required." },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: EMAIL_VERIFICATION_INVALID_MESSAGE },
        { status: 400 },
      );
    }

    console.error("[verify-email] request failed");
    return NextResponse.json(
      { error: "Email verification failed. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return postVerifyEmail(request);
}
