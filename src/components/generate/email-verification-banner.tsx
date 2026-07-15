"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/auth/email-verification";

type EmailVerificationBannerProps = {
  initialVerified: boolean;
};

export function EmailVerificationBanner({
  initialVerified,
}: EmailVerificationBannerProps) {
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">(
    "success",
  );

  if (isVerified) {
    return null;
  }

  async function handleResend() {
    setIsSending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json()) as {
        message?: string;
        error?: string;
        alreadyVerified?: boolean;
      };

      if (response.status === 429) {
        setFeedbackTone("error");
        setFeedback(
          typeof data.error === "string"
            ? data.error
            : "Too many attempts. Please try again later.",
        );
        return;
      }

      if (!response.ok && response.status !== 200) {
        setFeedbackTone("error");
        setFeedback(
          typeof data.error === "string"
            ? data.error
            : "Could not resend verification email. Please try again.",
        );
        return;
      }

      if (data.alreadyVerified) {
        setIsVerified(true);
        setFeedbackTone("success");
        setFeedback(
          typeof data.message === "string"
            ? data.message
            : "Your email is already confirmed.",
        );
        return;
      }

      setFeedbackTone("success");
      setFeedback(
        typeof data.message === "string"
          ? data.message
          : "We sent a new verification link to your email.",
      );
    } catch {
      setFeedbackTone("error");
      setFeedback("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
      role="status"
    >
      <p className="font-medium text-foreground">
        {EMAIL_VERIFICATION_REQUIRED_MESSAGE}
      </p>
      <p className="mt-1 text-muted-foreground">
        Check your inbox for a confirmation link. You can browse templates and
        settings while unverified.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={isSending}
          className="border-warning/40 bg-background/80 hover:bg-background"
        >
          {isSending ? "Sending..." : "Resend verification email"}
        </Button>
        {feedback && (
          <p
            className={
              feedbackTone === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            }
          >
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
