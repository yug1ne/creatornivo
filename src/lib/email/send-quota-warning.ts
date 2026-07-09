import { PLANS } from "@/config/plans";
import { siteConfig } from "@/config/site";
import { getSafeEmailHash } from "@/lib/auth/credentials";
import { prisma } from "@/lib/db";
import { getQuotaResetHint } from "@/lib/usage/quota-copy";
import { getUtcDayStart, USAGE_PERIOD } from "@/lib/usage";

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

export type QuotaWarningEmailUser = {
  userId: string;
  email: string;
  name: string | null;
  resetAt: string;
};

export function buildQuotaWarningEmailText(input: {
  name: string | null;
  resetAt: string;
  baseUrl?: string;
  now?: Date;
}): string {
  const baseUrl = normalizeEmailBaseUrl(input.baseUrl);
  const resetHint = getQuotaResetHint(
    USAGE_PERIOD.DAILY,
    input.resetAt,
    input.now,
  );

  return [
    emailGreeting(input.name),
    "",
    "You have 1 generation left today.",
    "",
    `Your Free plan includes 5 generations per day (UTC). ${resetHint}.`,
    "",
    "If you want more headroom, Pro includes 100 generations per month — totally optional.",
    "",
    "Continue generating:",
    `${baseUrl}/generate`,
    "",
    "View Pro pricing:",
    `${baseUrl}/pricing`,
    "",
    ...renderEmailTextSignOff(),
  ].join("\n");
}

export function buildQuotaWarningEmailHtml(input: {
  name: string | null;
  resetAt: string;
  baseUrl?: string;
  now?: Date;
}): string {
  const baseUrl = normalizeEmailBaseUrl(input.baseUrl);
  const resetHint = escapeHtml(
    getQuotaResetHint(USAGE_PERIOD.DAILY, input.resetAt, input.now),
  );

  return renderTransactionalEmailHtml({
    title: "1 generation left today",
    preheader:
      "You have one free generation remaining. Your quota resets at midnight UTC.",
    greetingHtml: emailGreetingHtml(input.name),
    bodyHtml: [
      renderEmailParagraph(
        "Just a friendly heads-up: you have <strong>1 free generation left today</strong>.",
      ),
      renderEmailParagraph(
        "Use it when you&rsquo;re ready — there&rsquo;s no rush, and nothing expires early.",
      ),
    ].join(""),
    highlight: {
      title: "Free plan",
      bodyHtml: `<strong>5 generations per day</strong> (UTC). ${resetHint}.`,
      variant: "warning",
    },
    primaryCta: {
      href: `${baseUrl}/generate`,
      label: "Continue generating →",
    },
    secondaryCtas: [
      { href: `${baseUrl}/pricing`, label: "View Pro pricing" },
      { href: `${baseUrl}/dashboard`, label: "Open dashboard" },
    ],
    footerNoteHtml:
      "Pro includes 100 generations per month if you ever want more headroom — totally optional.",
    baseUrl,
  });
}

/**
 * Warns Free users when one daily generation remains. At most one email per UTC day
 * (dedupe via `UserUsage.quotaWarningEmailSentAt` on the daily bucket).
 */
export async function sendQuotaWarningEmail(
  input: QuotaWarningEmailUser,
  now = new Date(),
): Promise<{ delivered: boolean; skipped?: boolean }> {
  const emailHash = getSafeEmailHash(input.email);
  const date = getUtcDayStart(now);
  const sentAt = new Date();

  const claimed = await prisma.userUsage.updateMany({
    where: {
      userId: input.userId,
      date,
      period: USAGE_PERIOD.DAILY,
      quotaWarningEmailSentAt: null,
    },
    data: { quotaWarningEmailSentAt: sentAt },
  });

  if (claimed.count === 0) {
    return { delivered: false, skipped: true };
  }

  const text = buildQuotaWarningEmailText({
    name: input.name,
    resetAt: input.resetAt,
    now,
  });
  const html = buildQuotaWarningEmailHtml({
    name: input.name,
    resetAt: input.resetAt,
    now,
  });

  const { delivered } = await sendTransactionalEmail({
    to: input.email,
    subject: `1 free generation left today — ${siteConfig.name}`,
    text,
    html,
    emailHash,
    kind: "quota warning",
  });

  if (!delivered) {
    await prisma.userUsage.updateMany({
      where: {
        userId: input.userId,
        date,
        period: USAGE_PERIOD.DAILY,
        quotaWarningEmailSentAt: sentAt,
      },
      data: { quotaWarningEmailSentAt: null },
    });
  }

  return { delivered };
}

/** Loads user contact fields and sends quota-warning email when still on Free. */
export async function maybeSendQuotaWarningEmail(
  userId: string,
  resetAt: string,
  now = new Date(),
): Promise<{ delivered: boolean; skipped?: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, plan: true },
  });

  if (!user || user.plan !== PLANS.FREE) {
    return { delivered: false, skipped: true };
  }

  return sendQuotaWarningEmail(
    {
      userId,
      email: user.email,
      name: user.name,
      resetAt,
    },
    now,
  );
}
