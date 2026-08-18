import type { Metadata } from "next";

import { VerifyEmailConfirmation } from "@/components/auth/verify-email-confirmation";
import { getOptionalSafeCallbackUrl } from "@/lib/auth/callback-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string; callbackUrl?: string }>;
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
  const callbackUrl = getOptionalSafeCallbackUrl(
    typeof params.callbackUrl === "string" ? params.callbackUrl : null,
  );

  return (
    <VerifyEmailConfirmation token={token} callbackUrl={callbackUrl} />
  );
}
