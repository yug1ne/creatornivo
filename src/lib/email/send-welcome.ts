import { getOnboardingStarterGenerateUrl } from "@/config/onboarding";
import { earlyAccessConfig } from "@/config/early-access";
import { siteConfig } from "@/config/site";
import { getSafeEmailHash } from "@/lib/auth/credentials";
import { prisma } from "@/lib/db";

import { getEmailFromAddress, getResendClient, isResendConfigured } from "./client";

export type WelcomeEmailUser = {
  userId: string;
  email: string;
  name: string | null;
};

function getAppBaseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    siteConfig.url
  ).replace(/\/$/, "");
}

export function buildWelcomeEmailText(input: {
  name: string | null;
  baseUrl?: string;
}): string {
  const baseUrl = (input.baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : "Hi there,";
  const generateUrl = `${baseUrl}${getOnboardingStarterGenerateUrl()}`;

  return [
    greeting,
    "",
    `Welcome to ${siteConfig.name}!`,
    "",
    `You're in Early Access — ${earlyAccessConfig.statusBannerMessage}`,
    "",
    "On the Free plan you get 5 generations per day (UTC). Pick a template, add your topic, and generate content in real time.",
    "",
    "Start with LinkedIn Post:",
    generateUrl,
    "",
    "Browse templates:",
    `${baseUrl}/templates`,
    "",
    "Your dashboard:",
    `${baseUrl}/dashboard`,
    "",
    `Questions? ${siteConfig.legal.privacyEmail}`,
    "",
    `— ${siteConfig.name}`,
  ].join("\n");
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

  if (!isResendConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[email] RESEND_API_KEY missing; welcome email not sent for ${emailHash}`,
      );
    } else {
      console.warn(
        `[email] RESEND_API_KEY missing; welcome email skipped for ${emailHash}`,
      );
    }
    return { delivered: false };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn(
      `[email] Resend client unavailable; welcome email skipped for ${emailHash}`,
    );
    return { delivered: false };
  }

  const result = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.email,
    subject: `Welcome to ${siteConfig.name}`,
    text,
  });

  if (result.error) {
    console.error(
      `[email] Failed to send welcome email for ${emailHash}`,
      result.error,
    );
    await prisma.user.update({
      where: { id: input.userId },
      data: { welcomeEmailSentAt: null },
    });
    return { delivered: false };
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[email] Welcome email queued for ${emailHash}`);
  }

  return { delivered: true };
}