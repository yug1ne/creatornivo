import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TrialActivationClient } from "@/components/trial/trial-activation-client";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activate private trial",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function ActivateTrialPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/try/activate");
  }

  return <TrialActivationClient />;
}
