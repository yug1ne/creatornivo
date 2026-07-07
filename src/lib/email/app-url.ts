import { siteConfig } from "@/config/site";

/** Canonical app origin for links in transactional emails. */
export function getAppBaseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    siteConfig.url
  ).replace(/\/$/, "");
}