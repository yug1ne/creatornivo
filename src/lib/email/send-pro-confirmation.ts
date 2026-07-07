import { siteConfig } from "@/config/site";
import { getSafeEmailHash } from "@/lib/auth/credentials";
import { prisma } from "@/lib/db";

import { getAppBaseUrl } from "./app-url";
import { sendTransactionalEmail } from "./send-transactional";

export type ProConfirmationEmailUser = {
  userId: string;
  email: string;
  name: string | null;
};

export function buildProConfirmationEmailText(input: {
  name: string | null;
  baseUrl?: string;
}): string {
  const baseUrl = (input.baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : "Hi there,";

  return [
    greeting,
    "",
    `Your ${siteConfig.name} Pro subscription is active.`,
    "",
    "Here's what's included:",
    "- 100 generations per month (UTC)",
    "- Access to all templates",
    "- Export as Markdown (.md) or plain text (.txt)",
    "",
    "Start generating:",
    `${baseUrl}/generate`,
    "",
    "Manage your subscription:",
    `${baseUrl}/settings#subscription`,
    "",
    `Questions? ${siteConfig.legal.privacyEmail}`,
    "",
    `— ${siteConfig.name}`,
  ].join("\n");
}

/**
 * Sends Pro confirmation once per user (idempotent via `proConfirmationEmailSentAt`).
 * Intended after Paddle webhook upgrades plan free → pro.
 */
export async function sendProConfirmationEmail(
  input: ProConfirmationEmailUser,
): Promise<{ delivered: boolean; skipped?: boolean }> {
  const emailHash = getSafeEmailHash(input.email);

  const claimed = await prisma.user.updateMany({
    where: { id: input.userId, proConfirmationEmailSentAt: null },
    data: { proConfirmationEmailSentAt: new Date() },
  });

  if (claimed.count === 0) {
    return { delivered: false, skipped: true };
  }

  const text = buildProConfirmationEmailText({ name: input.name });
  const { delivered } = await sendTransactionalEmail({
    to: input.email,
    subject: `Your ${siteConfig.name} Pro subscription is active`,
    text,
    emailHash,
    kind: "pro confirmation",
  });

  if (!delivered) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { proConfirmationEmailSentAt: null },
    });
  }

  return { delivered };
}