import { siteConfig } from "@/config/site";
import {
  getEmailVerificationUrl,
} from "@/lib/auth/email-verification";
import { getSafeEmailHash } from "@/lib/auth/credentials";

import {
  emailGreeting,
  emailGreetingHtml,
  escapeHtml,
  normalizeEmailBaseUrl,
  renderEmailParagraph,
  renderEmailTextSignOff,
  renderTransactionalEmailHtml,
} from "./layout";
import { sendTransactionalEmail } from "./send-transactional";

export function buildEmailVerificationText(input: {
  name: string | null;
  verifyUrl: string;
}): string {
  return [
    emailGreeting(input.name),
    "",
    `Confirm your email for ${siteConfig.name} to start generating content.`,
    "",
    "This link expires in 24 hours:",
    input.verifyUrl,
    "",
    "If you did not create an account, you can ignore this email.",
    "",
    ...renderEmailTextSignOff({ support: true }),
  ].join("\n");
}

export function buildEmailVerificationHtml(input: {
  name: string | null;
  verifyUrl: string;
  baseUrl?: string;
}): string {
  const baseUrl = normalizeEmailBaseUrl(input.baseUrl);
  const safeUrl = escapeHtml(input.verifyUrl);

  return renderTransactionalEmailHtml({
    title: "Confirm your email",
    preheader: "Confirm your email to generate content with Creatornivo.",
    greetingHtml: emailGreetingHtml(input.name),
    bodyHtml: [
      renderEmailParagraph(
        `Thanks for joining <strong>${escapeHtml(siteConfig.name)}</strong>. Confirm your email address to unlock generation.`,
      ),
      renderEmailParagraph(
        "This link expires in <strong>24 hours</strong>. After confirmation you can generate drafts with your free daily quota.",
      ),
      renderEmailParagraph(
        "If you didn&rsquo;t create an account, you can safely ignore this email.",
      ),
    ].join(""),
    highlight: {
      title: "Why we ask",
      bodyHtml:
        "Email confirmation helps protect free generation limits and keeps the product reliable for real users.",
      variant: "info",
    },
    primaryCta: {
      href: input.verifyUrl,
      label: "Confirm email →",
    },
    secondaryCtas: [{ href: `${baseUrl}/login`, label: "Back to sign in" }],
    footerNoteHtml: `If the button doesn&rsquo;t work, copy and paste this link into your browser:<br /><span style="word-break:break-all;color:#4f46e5;">${safeUrl}</span>`,
    baseUrl,
  });
}

export async function sendEmailVerificationEmail(input: {
  email: string;
  name: string | null;
  plainToken: string;
}): Promise<{ delivered: boolean; verifyUrl: string }> {
  const verifyUrl = getEmailVerificationUrl(input.plainToken);
  const emailHash = getSafeEmailHash(input.email);

  const text = buildEmailVerificationText({
    name: input.name,
    verifyUrl,
  });
  const html = buildEmailVerificationHtml({
    name: input.name,
    verifyUrl,
  });

  const { delivered } = await sendTransactionalEmail({
    to: input.email,
    subject: `Confirm your ${siteConfig.name} email`,
    text,
    html,
    emailHash,
    kind: "email verification",
  });

  if (!delivered && process.env.NODE_ENV === "development") {
    console.warn(
      `[email] Email verification not delivered for ${emailHash}. Dev link: ${verifyUrl}`,
    );
  }

  return { delivered, verifyUrl };
}
