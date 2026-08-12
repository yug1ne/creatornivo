"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

const INVALID_LINK_MESSAGE =
  "This confirmation link is invalid or has expired. Request a new verification email.";
const SUCCESS_MESSAGE =
  "Your email is confirmed. You can generate content now.";

type ConfirmationState =
  | { status: "ready" }
  | { status: "submitting" }
  | {
      status: "success";
      message: string;
      trialActivationNeedsRetry: boolean;
    }
  | { status: "error"; message: string };

type VerifyEmailResponse = {
  error?: string;
  message?: string;
  trialStatus?: string | null;
  trialActivationNeedsRetry?: boolean;
};

export function VerifyEmailConfirmation({ token }: { token: string }) {
  const [state, setState] = useState<ConfirmationState>(() =>
    token
      ? { status: "ready" }
      : {
          status: "error",
          message: "A verification token is required.",
        },
  );

  async function confirmEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || state.status === "submitting") return;

    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json()) as VerifyEmailResponse;

      if (!response.ok) {
        setState({
          status: "error",
          message: data.error ?? INVALID_LINK_MESSAGE,
        });
        return;
      }

      const trialActivated =
        data.trialStatus === "activated" ||
        data.trialStatus === "already_active";
      const trialActivationNeedsRetry =
        data.trialActivationNeedsRetry === true;

      setState({
        status: "success",
        message: trialActivated
          ? "Your email is confirmed and your private trial is active."
          : trialActivationNeedsRetry
            ? "Your email is confirmed. Continue to finish trial activation."
            : data.message ?? SUCCESS_MESSAGE,
        trialActivationNeedsRetry,
      });
    } catch {
      setState({
        status: "error",
        message: "Email verification failed. Please try again.",
      });
    }
  }

  const isSuccess = state.status === "success";
  const isSubmitting = state.status === "submitting";
  const message =
    state.status === "ready"
      ? "Confirm that you want to verify this email address."
      : state.status === "submitting"
        ? "Confirming your email..."
        : state.message;

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

      {state.status === "ready" || state.status === "submitting" ? (
        <form className="mt-8" onSubmit={confirmEmail}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Confirming..." : "Confirm email"}
          </button>
        </form>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          If you are signed in, open Generate and use{" "}
          <strong className="font-medium text-foreground">
            Resend verification email
          </strong>
          . You can also sign in first, then resend from there.
        </p>
      ) : null}

      {isSuccess ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={
              state.trialActivationNeedsRetry ? "/try/activate" : "/generate"
            }
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
        </div>
      ) : state.status === "error" ? (
        <div className="mt-8 flex flex-wrap gap-3">
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
        </div>
      ) : null}
    </section>
  );
}
