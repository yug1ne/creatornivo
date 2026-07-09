import { getOnboardingStarterGenerateUrl } from "@/config/onboarding";
import { earlyAccessConfig } from "@/config/early-access";
import { siteConfig } from "@/config/site";
import { getSafeEmailHash } from "@/lib/auth/credentials";
import { prisma } from "@/lib/db";

import {
  emailGreeting,
  emailGreetingHtml,
  escapeHtml,
  normalizeEmailBaseUrl,
  renderEmailList,
  renderEmailParagraph,
  renderEmailTextSignOff,
  renderTransactionalEmailHtml,
} from "./layout";
import { sendTransactionalEmail } from "./send-transactional";

export type WelcomeEmailUser = {
  userId: string;
  email: string;
  name: string | null;
};

export function buildWelcomeEmailLinks(baseUrl?: string) {
  const root = normalizeEmailBaseUrl(baseUrl);
  return {
    baseUrl: root,
    generateUrl: `${root}${getOnboardingStarterGenerateUrl()}`,
    templatesUrl: `${root}/templates`,
    dashboardUrl: `${root}/dashboard`,
  };
}

export function buildWelcomeEmailText(input: {
  name: string | null;
  baseUrl?: string;
}): string {
  const { generateUrl, templatesUrl, dashboardUrl } = buildWelcomeEmailLinks(
    input.baseUrl,
  );

  return [
    emailGreeting(input.name),
    "",
    `Welcome to ${siteConfig.name} — glad you're here.`,
    "",
    "You're in Early Access. That means the product is real and working, and we're still improving it with honest feedback from early users.",
    earlyAccessConfig.statusBannerMessage,
    "",
    "On Free you get 5 generations per day (UTC). Pick a template, fill in a few fields, and get a draft you can edit — no blank page.",
    "",
    "A simple way to start:",
    "1. Open LinkedIn Post (our recommended starter)",
    "2. Add your topic and generate",
    "3. Save anything useful to your library",
    "",
    "Start with LinkedIn Post:",
    generateUrl,
    "",
    "Browse all templates:",
    templatesUrl,
    "",
    "Your dashboard:",
    dashboardUrl,
    "",
    ...renderEmailTextSignOff(),
  ].join("\n");
}

export function buildWelcomeEmailHtml(input: {
  name: string | null;
  baseUrl?: string;
}): string {
  const { generateUrl, templatesUrl, dashboardUrl, baseUrl } =
    buildWelcomeEmailLinks(input.baseUrl);
  const statusLine = escapeHtml(earlyAccessConfig.statusBannerMessage);

  return renderTransactionalEmailHtml({
    title: `Welcome to ${siteConfig.name}`,
    preheader:
      "Start with a LinkedIn Post template — 5 free generations per day.",
    greetingHtml: emailGreetingHtml(input.name),
    bodyHtml: [
      renderEmailParagraph(
        "Glad you&rsquo;re here. You now have a calm workspace for structured AI drafts — templates for social, email, blogs, and more, without the blank-page freeze.",
      ),
      renderEmailParagraph(
        `You&rsquo;re in <strong style="color:#4338ca;">Early Access</strong>. The product is real and shipping; we&rsquo;re still polishing based on honest feedback. ${statusLine}`,
      ),
      `<p style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#18181b;">A simple way to start</p>`,
      renderEmailList([
        "Open the LinkedIn Post starter template",
        "Add your topic and generate a draft",
        "Save anything useful to your library",
      ]),
    ].join(""),
    highlight: {
      title: "Free plan",
      bodyHtml:
        "<strong>5 generations per day</strong> (UTC). Errors before generation starts don&rsquo;t use your quota.",
      variant: "info",
    },
    primaryCta: {
      href: generateUrl,
      label: "Start with LinkedIn Post →",
    },
    secondaryCtas: [
      { href: templatesUrl, label: "Browse templates" },
      { href: dashboardUrl, label: "Open dashboard" },
    ],
    signOff: `The ${siteConfig.name} team`,
    baseUrl,
  });
}

export async function sendWelcomeEmail(
  input: WelcomeEmailUser,
): Promise<{ delivered: boolean; skipped?: boolean }> {
  const emailHash = getSafeEmailHash(input.email);

  const claimed = await prisma.user.updateMany({
    where: { id: input.userId, welcomeEmailSentAt: null },
    data: { welcomeEmailSentAt: new Date() },
  });

  if (claimed.count === 0) {
    return { delivered: false, skipped: true };
  }

  const text = buildWelcomeEmailText({ name: input.name });
  const html = buildWelcomeEmailHtml({ name: input.name });
  const { delivered } = await sendTransactionalEmail({
    to: input.email,
    subject: `Welcome to ${siteConfig.name}`,
    text,
    html,
    emailHash,
    kind: "welcome",
  });

  if (!delivered) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { welcomeEmailSentAt: null },
    });
  }

  return { delivered };
}
