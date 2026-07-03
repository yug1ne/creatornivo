"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

import type { BillingProvider } from "@/config/billing";
import { PLANS } from "@/config/plans";
import { buttonVariants } from "@/components/ui/button";

interface SubscriptionInfo {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: BillingProvider | null;
}

interface SubscriptionManagerProps {
  subscription: SubscriptionInfo | null;
  isBillingConfigured: boolean;
  billingProvider: BillingProvider | null;
}

function SubscriptionManagerContent({
  subscription,
  isBillingConfigured,
  billingProvider,
}: SubscriptionManagerProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const [loadingAction, setLoadingAction] = useState<
    "update" | "cancel" | "stripe" | null
  >(null);
  const [message, setMessage] = useState("");

  const isPro = session?.user?.plan === PLANS.PRO;

  useEffect(() => {
    if (checkoutStatus === "success") {
      update().then(() => {
        setMessage(
          "Payment received. Pro access will appear after secure webhook confirmation.",
        );
        router.replace("/settings");
      });
    }
  }, [checkoutStatus, update, router]);

  async function handlePortal(action: "update" | "cancel" | "stripe") {
    setLoadingAction(action);

    const endpoint =
      billingProvider === "paddle"
        ? "/api/paddle/portal"
        : "/api/stripe/portal";

    const response = await fetch(endpoint, { method: "POST" });
    const data = await response.json();
    setLoadingAction(null);

    if (!response.ok) {
      setMessage(data.error ?? "Something went wrong");
      return;
    }

    const url =
      action === "update"
        ? data.updatePaymentMethodUrl
        : action === "cancel"
          ? data.cancelSubscriptionUrl
          : data.url;

    if (!url) {
      setMessage("This subscription management action is unavailable.");
      return;
    }

    window.location.href = url;
  }

  return (
    <div className="rounded-xl border border-border p-6">
      <h3 className="font-medium text-foreground">Subscription</h3>

      <p className="mt-2 text-sm text-muted-foreground">
        Current plan:{" "}
        <span className="font-medium text-foreground">
          {isPro ? "Pro" : "Free"}
        </span>
      </p>

      {subscription?.status && (
        <p className="mt-1 text-xs text-muted-foreground">
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
        {!isPro && isBillingConfigured && (
          <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
            Upgrade to Pro
          </Link>
        )}

        {subscription &&
          isBillingConfigured &&
          billingProvider === "paddle" && (
            <>
              <button
                type="button"
                onClick={() => handlePortal("update")}
                disabled={loadingAction !== null}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "disabled:opacity-50",
                })}
              >
                {loadingAction === "update"
                  ? "Loading..."
                  : "Update payment method"}
              </button>
              <button
                type="button"
                onClick={() => handlePortal("cancel")}
                disabled={loadingAction !== null}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "disabled:opacity-50",
                })}
              >
                {loadingAction === "cancel"
                  ? "Loading..."
                  : "Cancel subscription"}
              </button>
            </>
          )}

        {isPro &&
          subscription &&
          isBillingConfigured &&
          billingProvider === "stripe" && (
          <button
            type="button"
            onClick={() => handlePortal("stripe")}
            disabled={loadingAction !== null}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "disabled:opacity-50",
            })}
          >
            {loadingAction === "stripe" ? "Loading..." : "Manage subscription"}
          </button>
          )}
      </div>
    </div>
  );
}

export function SubscriptionManager(props: SubscriptionManagerProps) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
      <SubscriptionManagerContent {...props} />
    </Suspense>
  );
}
