import { NextResponse } from "next/server";

import {
  EMAIL_VERIFICATION_INVALID_MESSAGE,
  EMAIL_VERIFICATION_SUCCESS_MESSAGE,
  EmailVerificationError,
  verifyEmailWithToken,
} from "@/lib/auth/email-verification";
import { prismaEmailVerificationStore } from "@/lib/auth/email-verification-store";
import { activateClaimedTrialAfterVerification } from "@/lib/trial/invites";

type VerifyEmailRouteDependencies = {
  verify?: typeof verifyEmailWithToken;
  activateClaimedTrial?: typeof activateClaimedTrialAfterVerification;
};

export async function postVerifyEmail(
  request: Request,
  dependencies: VerifyEmailRouteDependencies = {},
) {
  const verify = dependencies.verify ?? verifyEmailWithToken;
  const activateClaimedTrial =
    dependencies.activateClaimedTrial ?? activateClaimedTrialAfterVerification;

  try {
    const body = (await request.json()) as { token?: string };
    const result = await verify(body.token, prismaEmailVerificationStore);
    let trialStatus: string | null = null;
    let trialActivationNeedsRetry = false;
    try {
      const activation = await activateClaimedTrial(result.userId);
      trialStatus = activation.status;
    } catch {
      // Email verification must not be rolled back by an independent trial
      // activation failure. The claimed invite remains recoverable.
      console.error("[verify-email] claimed trial activation failed");
      trialActivationNeedsRetry = true;
    }

    return NextResponse.json({
      message: result.alreadyVerified
        ? EMAIL_VERIFICATION_SUCCESS_MESSAGE
        : EMAIL_VERIFICATION_SUCCESS_MESSAGE,
      alreadyVerified: result.alreadyVerified,
      trialStatus,
      trialActivationNeedsRetry,
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
