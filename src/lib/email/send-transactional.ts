import { getSafeEmailHash } from "@/lib/auth/credentials";

import { getEmailFromAddress, getResendClient, isResendConfigured } from "./client";

export type TransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body (multipart with `text` fallback). */
  html?: string;
  /** Precomputed hash for logs; derived from `to` when omitted. */
  emailHash?: string;
  /** Short label for log lines, e.g. "welcome", "pro confirmation". */
  kind?: string;
};

/**
 * Sends a transactional email via Resend (text, optional HTML).
 * Returns `{ delivered: false }` when Resend is unavailable or send fails — callers handle dedupe rollback.
 */
export async function sendTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<{ delivered: boolean }> {
  const emailHash = input.emailHash ?? getSafeEmailHash(input.to);
  const kind = input.kind ?? "transactional";

  if (!isResendConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[email] RESEND_API_KEY missing; ${kind} email not sent for ${emailHash}`,
      );
    } else {
      console.warn(
        `[email] RESEND_API_KEY missing; ${kind} email skipped for ${emailHash}`,
      );
    }
    return { delivered: false };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn(
      `[email] Resend client unavailable; ${kind} email skipped for ${emailHash}`,
    );
    return { delivered: false };
  }

  const result = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    ...(input.html ? { html: input.html } : {}),
  });

  if (result.error) {
    console.error(
      `[email] Failed to send ${kind} email for ${emailHash}`,
      result.error,
    );
    return { delivered: false };
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[email] ${kind} email queued for ${emailHash}`);
  }

  return { delivered: true };
}