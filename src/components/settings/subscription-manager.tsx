"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

import { PLANS } from "@/config/plans";

interface SubscriptionInfo {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionManagerProps {
  subscription: SubscriptionInfo | null;
  isStripeConfigured: boolean;
}

function SubscriptionManagerContent({
  subscription,
  isStripeConfigured,
}: SubscriptionManagerProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isPro = session?.user?.plan === PLANS.PRO;

  useEffect(() => {
    if (checkoutStatus === "success") {
      update().then(() => {
        setMessage("Pro subscription activated successfully!");
        router.replace("/settings");
      });
    }
  }, [checkoutStatus, update, router]);

  async function handlePortal() {
    setIsLoading(true);
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Something went wrong");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <h3 className="font-medium text-zinc-900 dark:text-zinc-50">Subscription</h3>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Current plan:{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {isPro ? "Pro" : "Free"}
        </span>
      </p>

      {subscription?.status && (
        <p className="mt-1 text-xs text-zinc-400">
          Status: {subscription.status}
          {subscription.currentPeriodEnd && (
            <>
              {" · "}
              until{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                "en-US",
              )}
            </>
          )}
          {subscription.cancelAtPeriodEnd && " (cancels at end of period)"}
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!isPro && isStripeConfigured && (
          <Link
            href="/pricing"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Upgrade to Pro
          </Link>
        )}

        {isPro && subscription && isStripeConfigured && (
          <button
            type="button"
            onClick={handlePortal}
            disabled={isLoading}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {isLoading ? "Loading..." : "Manage subscription"}
          </button>
        )}
      </div>
    </div>
  );
}

export function SubscriptionManager(props: SubscriptionManagerProps) {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
      <SubscriptionManagerContent {...props} />
    </Suspense>
  );
}