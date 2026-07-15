import Link from "next/link";

import {
  EMAIL_VERIFICATION_INVALID_MESSAGE,
  EMAIL_VERIFICATION_SUCCESS_MESSAGE,
  EmailVerificationError,
  verifyEmailWithToken,
} from "@/lib/auth/email-verification";
import { prismaEmailVerificationStore } from "@/lib/auth/email-verification-store";

export const dynamic = "force-dynamic";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  let outcome: "success" | "invalid" | "missing" = "missing";
  let message = "Open the confirmation link from your email to verify your address.";

  if (token) {
    try {
      await verifyEmailWithToken(token, prismaEmailVerificationStore);
      outcome = "success";
      message = EMAIL_VERIFICATION_SUCCESS_MESSAGE;
    } catch (error) {
      outcome = "invalid";
      message =
        error instanceof EmailVerificationError && error.code === "missing_token"
          ? "A verification token is required."
          : EMAIL_VERIFICATION_INVALID_MESSAGE;
    }
  }

  const isSuccess = outcome === "success";

  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {isSuccess ? "Email confirmed" : "Confirm your email"}
      </h1>
      <p
        className={`mt-3 text-sm ${
          isSuccess ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {message}
      </p>

      {!isSuccess && (
        <p className="mt-3 text-sm text-muted-foreground">
          If you are signed in, open Generate and use{" "}
          <strong className="font-medium text-foreground">
            Resend verification email
          </strong>
          . You can also sign in first, then resend from there.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {isSuccess ? (
          <>
            <Link
              href="/generate"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Generate
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
            >
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
            <Link
              href="/generate"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
            >
              Open Generate
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
