import { Resend } from "resend";

import { siteConfig } from "@/config/site";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getEmailFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    `${siteConfig.name} <${siteConfig.legal.privacyEmail}>`
  );
}

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}