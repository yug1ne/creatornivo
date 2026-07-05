import { getSafeEmailHash } from "@/lib/auth/credentials";
import { getPasswordResetUrl } from "@/lib/auth/password-reset";
import { siteConfig } from "@/config/site";

import { getEmailFromAddress, getResendClient, isResendConfigured } from "./client";

export async function sendPasswordResetEmail(input: {
  email: string;
  plainToken: string;
}) {
  const resetUrl = getPasswordResetUrl(input.plainToken);
  const emailHash = getSafeEmailHash(input.email);

  if (!isResendConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[email] RESEND_API_KEY missing; password reset link generated for ${emailHash}: ${resetUrl}`,
      );
    } else {
      console.warn(
        `[email] RESEND_API_KEY missing; password reset requested for ${emailHash}. Contact ${siteConfig.legal.privacyEmail}.`,
      );
    }
    return { delivered: false, resetUrl };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn(
      `[email] Resend client unavailable; password reset requested for ${emailHash}`,
    );
    return { delivered: false, resetUrl };
  }

  const result = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.email,
    subject: `Reset your ${siteConfig.name} password`,
    text: [
      `You requested a password reset for your ${siteConfig.name} account.`,
      "",
      `Reset your password using this link (valid for 60 minutes):`,
      resetUrl,
      "",
      `If you did not request this, you can ignore this email.`,
      "",
      `Support: ${siteConfig.legal.privacyEmail}`,
    ].join("\n"),
  });

  if (result.error) {
    console.error(
      `[email] Failed to send password reset for ${emailHash}`,
      result.error,
    );
    return { delivered: false, resetUrl };
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[email] Password reset email queued for ${emailHash}`);
  }

  return { delivered: true, resetUrl };
}