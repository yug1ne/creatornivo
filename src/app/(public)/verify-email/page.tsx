import type { Metadata } from "next";

import { VerifyEmailConfirmation } from "@/components/auth/verify-email-confirmation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

/**
 * Display-only GET. Verification tokens are consumed exclusively by the
 * explicit POST submitted from VerifyEmailConfirmation.
 */
export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return <VerifyEmailConfirmation token={token} />;
}
