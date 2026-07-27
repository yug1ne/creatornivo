import { siteConfig } from "@/config/site";
import { getSafeEmailHash } from "@/lib/auth/credentials";
import { prisma } from "@/lib/db";

import {
  emailGreeting,
  emailGreetingHtml,
  normalizeEmailBaseUrl,
  renderEmailList,
  renderEmailParagraph,
  renderEmailTextSignOff,
  renderTransactionalEmailHtml,
} from "./layout";
import { sendTransactionalEmail } from "./send-transactional";

export type ProConfirmationEmailUser = {
  userId: string;
  email: string;
  name: string | null;
};

export function buildProConfirmationEmailLinks(baseUrl?: string) {
  const root = normalizeEmailBaseUrl(baseUrl);
  return {
    baseUrl: root,
    generateUrl: `${root}/generate`,
    settingsUrl: `${root}/settings#subscription`,
    templatesUrl: `${root}/templates`,
  };
}

export function buildProConfirmationEmailText(input: {
  name: string | null;
  baseUrl?: string;
}): string {
  const { generateUrl, settingsUrl } = buildProConfirmationEmailLinks(
    input.baseUrl,
  );

  return [
    emailGreeting(input.name),
    "",
    `Your ${siteConfig.name} Pro subscription is active.`,
    "",
    "Thank you for supporting CreatorNivo Pro. Here's what's unlocked:",
    "- 100 generations per billing period (provider period for paid Freemius Pro)",
    "- Access to all templates",
    "- Export as Markdown (.md) or plain text (.txt)",
    "",
    "Start generating:",
    generateUrl,
    "",
    "Manage billing in Freemius (Settings → Billing):",
    settingsUrl,
    "",
    ...renderEmailTextSignOff(),
  ].join("\n");
}

export function buildProConfirmationEmailHtml(input: {
  name: string | null;
  baseUrl?: string;
}): string {
  const { generateUrl, settingsUrl, templatesUrl, baseUrl } =
    buildProConfirmationEmailLinks(input.baseUrl);

  return renderTransactionalEmailHtml({
    title: "Pro is active",
    preheader:
      "Your CreatorNivo Pro subscription is live — 100 generations per billing period and all templates.",
    greetingHtml: emailGreetingHtml(input.name),
    bodyHtml: [
      renderEmailParagraph(
        `Your <strong>${siteConfig.name} Pro</strong> subscription is active. Thank you for supporting the product — it helps us keep improving honestly.`,
      ),
      renderEmailParagraph("Here&rsquo;s what you can use right away:"),
      renderEmailList([
        "<strong>100 generations per billing period</strong> (provider period for paid Freemius Pro)",
        "Access to <strong>all templates</strong>",
        "Export as <strong>Markdown (.md)</strong> or plain text (.txt)",
      ]),
    ].join(""),
    highlight: {
      title: "You're on Pro",
      bodyHtml:
        "No daily free-plan ceiling. Use your billing-period quota for the work that matters this cycle.",
      variant: "success",
    },
    primaryCta: {
      href: generateUrl,
      label: "Start generating →",
    },
    secondaryCtas: [
      { href: templatesUrl, label: "Browse templates" },
      { href: settingsUrl, label: "Manage billing" },
    ],
    baseUrl,
  });
}

/**
 * Sends Pro confirmation once per user (idempotent via `proConfirmationEmailSentAt`).
 * Triggered after provider webhook upgrades plan free → pro (Freemius or legacy paths).
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
  const html = buildProConfirmationEmailHtml({ name: input.name });
  const { delivered } = await sendTransactionalEmail({
    to: input.email,
    subject: `Your ${siteConfig.name} Pro subscription is active`,
    text,
    html,
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
