import { siteConfig } from "@/config/site";
import { getSafeEmailHash } from "@/lib/auth/credentials";
import { getPasswordResetUrl } from "@/lib/auth/password-reset";

import {
  emailGreetingHtml,
  escapeHtml,
  normalizeEmailBaseUrl,
  renderEmailParagraph,
  renderEmailTextSignOff,
  renderTransactionalEmailHtml,
} from "./layout";
import { sendTransactionalEmail } from "./send-transactional";

export function buildPasswordResetEmailText(input: {
  resetUrl: string;
}): string {
  return [
    "Hi there,",
    "",
    `You requested a password reset for your ${siteConfig.name} account.`,
    "",
    "Reset your password using this link (valid for 60 minutes):",
    input.resetUrl,
    "",
    "If you did not request this, you can ignore this email — your password will stay the same.",
    "",
    ...renderEmailTextSignOff({ support: true }),
  ].join("\n");
}

export function buildPasswordResetEmailHtml(input: {
  resetUrl: string;
  baseUrl?: string;
}): string {
  const baseUrl = normalizeEmailBaseUrl(input.baseUrl);
  const safeUrl = escapeHtml(input.resetUrl);

  return renderTransactionalEmailHtml({
    title: "Reset your password",
    preheader: "Use this secure link within 60 minutes to choose a new password.",
    greetingHtml: emailGreetingHtml(null),
    bodyHtml: [
      renderEmailParagraph(
        `You requested a password reset for your <strong>${escapeHtml(siteConfig.name)}</strong> account.`,
      ),
      renderEmailParagraph(
        "Click the button below to choose a new password. This link expires in <strong>60 minutes</strong> for your security.",
      ),
      renderEmailParagraph(
        "If you didn&rsquo;t request this, you can safely ignore this email — your current password will stay the same.",
      ),
    ].join(""),
    highlight: {
      title: "Security tip",
      bodyHtml:
        "Never share this link. Creatornivo will never ask for your password by email.",
      variant: "info",
    },
    primaryCta: {
      href: input.resetUrl,
      label: "Reset password →",
    },
    secondaryCtas: [{ href: `${baseUrl}/login`, label: "Back to sign in" }],
    footerNoteHtml: `If the button doesn&rsquo;t work, copy and paste this link into your browser:<br /><span style="word-break:break-all;color:#4f46e5;">${safeUrl}</span>`,
    baseUrl,
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  plainToken: string;
}) {
  const resetUrl = getPasswordResetUrl(input.plainToken);
  const emailHash = getSafeEmailHash(input.email);

  const text = buildPasswordResetEmailText({ resetUrl });
  const html = buildPasswordResetEmailHtml({ resetUrl });

  const { delivered } = await sendTransactionalEmail({
    to: input.email,
    subject: `Reset your ${siteConfig.name} password`,
    text,
    html,
    emailHash,
    kind: "password reset",
  });

  // Preserve reset URL for callers / local diagnostics when email is not delivered.
  if (!delivered && process.env.NODE_ENV === "development") {
    console.warn(
      `[email] Password reset not delivered for ${emailHash}. Dev link: ${resetUrl}`,
    );
  }

  return { delivered, resetUrl };
}
