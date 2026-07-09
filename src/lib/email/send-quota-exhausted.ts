import { PLANS } from "@/config/plans";
import { siteConfig } from "@/config/site";
import { getSafeEmailHash } from "@/lib/auth/credentials";
import { prisma } from "@/lib/db";
import { getQuotaExceededCopy } from "@/lib/usage/quota-copy";
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

export type QuotaExhaustedEmailUser = {
  userId: string;
  email: string;
  name: string | null;
  resetAt: string;
};

export function buildQuotaExhaustedEmailText(input: {
  name: string | null;
  resetAt: string;
  baseUrl?: string;
  now?: Date;
}): string {
  const baseUrl = normalizeEmailBaseUrl(input.baseUrl);
  const { message: quotaMessage } = getQuotaExceededCopy(
    PLANS.FREE,
    input.resetAt,
    input.now,
  );
  const resetLine = quotaMessage
    .replace(/^You've used all 5 free generations today\. /, "")
    .replace(/ Upgrade to Pro for 100 generations per month\.$/, "");

  return [
    emailGreeting(input.name),
    "",
    "You've used all 5 free generations today.",
    "",
    resetLine,
    "",
    "If you need more capacity before then, Pro includes 100 generations per month — no pressure, your free quota returns automatically.",
    "",
    "View Pro pricing:",
    `${baseUrl}/pricing`,
    "",
    "Your dashboard:",
    `${baseUrl}/dashboard`,
    "",
    ...renderEmailTextSignOff(),
  ].join("\n");
}

export function buildQuotaExhaustedEmailHtml(input: {
  name: string | null;
  resetAt: string;
  baseUrl?: string;
  now?: Date;
}): string {
  const baseUrl = normalizeEmailBaseUrl(input.baseUrl);
  const { message: quotaMessage } = getQuotaExceededCopy(
    PLANS.FREE,
    input.resetAt,
    input.now,
  );
  const resetLine = escapeHtml(
    quotaMessage
      .replace(/^You've used all 5 free generations today\. /, "")
      .replace(/ Upgrade to Pro for 100 generations per month\.$/, ""),
  );

  return renderTransactionalEmailHtml({
    title: "Today's free generations are used",
    preheader:
      "You've used all 5 free generations today. Your quota resets at midnight UTC.",
    greetingHtml: emailGreetingHtml(input.name),
    bodyHtml: [
      renderEmailParagraph(
        "You&rsquo;ve used all <strong>5 free generations</strong> for today. Nice work getting real drafts done.",
      ),
      renderEmailParagraph(
        "Your free quota returns automatically — no action needed. Until then you can browse templates, review your library, or continue on Pro if you need more capacity.",
      ),
    ].join(""),
    highlight: {
      title: "Quota status",
      bodyHtml: resetLine,
      variant: "warning",
    },
    primaryCta: {
      href: `${baseUrl}/pricing`,
      label: "View Pro pricing →",
    },
    secondaryCtas: [
      { href: `${baseUrl}/dashboard`, label: "Open dashboard" },
      { href: `${baseUrl}/library`, label: "Open library" },
    ],
    footerNoteHtml:
      "Pro includes 100 generations per month — no pressure either way.",
    baseUrl,
  });
}

/**
 * Notifies Free users when daily quota hits zero. At most one email per UTC day
 * (dedupe via `UserUsage.quotaExhaustedEmailSentAt` on the daily bucket).
 */
export async function sendQuotaExhaustedEmail(
  input: QuotaExhaustedEmailUser,
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
      quotaExhaustedEmailSentAt: null,
    },
    data: { quotaExhaustedEmailSentAt: sentAt },
  });

  if (claimed.count === 0) {
    return { delivered: false, skipped: true };
  }

  const text = buildQuotaExhaustedEmailText({
    name: input.name,
    resetAt: input.resetAt,
    now,
  });
  const html = buildQuotaExhaustedEmailHtml({
    name: input.name,
    resetAt: input.resetAt,
    now,
  });

  const { delivered } = await sendTransactionalEmail({
    to: input.email,
    subject: `You've used today's free generations — ${siteConfig.name}`,
    text,
    html,
    emailHash,
    kind: "quota exhausted",
  });

  if (!delivered) {
    await prisma.userUsage.updateMany({
      where: {
        userId: input.userId,
        date,
        period: USAGE_PERIOD.DAILY,
        quotaExhaustedEmailSentAt: sentAt,
      },
      data: { quotaExhaustedEmailSentAt: null },
    });
  }

  return { delivered };
}

/** Loads user contact fields and sends quota-exhausted email when still on Free. */
export async function maybeSendQuotaExhaustedEmail(
  input: { userId: string; resetAt: string },
  now = new Date(),
): Promise<{ delivered: boolean; skipped?: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, name: true, plan: true },
  });

  if (!user || user.plan !== PLANS.FREE) {
    return { delivered: false, skipped: true };
  }

  return sendQuotaExhaustedEmail(
    {
      userId: input.userId,
      email: user.email,
      name: user.name,
      resetAt: input.resetAt,
    },
    now,
  );
}
