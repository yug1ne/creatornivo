"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

import type { BillingProvider } from "@/config/billing";
import { freemiusPricingDisplay } from "@/config/freemius-pricing-display";
import { PLANS, type Plan } from "@/config/plans";
import {
  buildFreemiusCheckoutRequestBody,
  resolveFreemiusCheckoutRedirect,
  type FreemiusCheckoutApiResponse,
} from "@/components/pricing/freemius-checkout-cta";
import { buttonVariants } from "@/components/ui/button";
import { formatHumanUtcDate } from "@/lib/usage/quota-copy";
import { isUsableProviderBillingPeriod } from "@/lib/usage/quota-period";

/** Shown after checkout return before webhook activates Pro (provider-agnostic). */
export const CHECKOUT_PENDING_MESSAGE =
  "Payment received. Pro access may take a moment and is activated after payment confirmation.";
export const CHECKOUT_CANCELLED_MESSAGE =
  "Checkout was cancelled. No changes were made to your plan.";
export const PRO_ACTIVE_MESSAGE = "Your Pro subscription is active.";
export const QUOTA_RESETS_SEPARATELY_MESSAGE =
  "Generation quota resets separately by UTC calendar month.";
/** Freemius (or any provider) Pro when currentPeriodStart/End drive the quota window. */
export const QUOTA_RESETS_WITH_BILLING_PERIOD_MESSAGE =
  "Generation quota resets with your billing period.";
export const FREEMIUS_PORTAL_UNAVAILABLE_MESSAGE =
  "No Freemius subscription is linked to this account. Manage billing only works for Freemius Pro subscriptions.";

/** Button label for Freemius Customer Portal (not CreatorNivo login). */
export const FREEMIUS_PORTAL_BUTTON_LABEL = "Manage billing in Freemius";

/**
 * Helper under the portal button — separate Freemius portal password vs app login.
 */
export const FREEMIUS_PORTAL_HELPER_MESSAGE =
  'Opens the Freemius Customer Portal for billing, invoices, payment method, and subscription renewal management. This portal uses a separate Freemius password. If you have not received one, use "Never received your password?" on the portal login page.';

function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Settings copy aligned with /generate quota basis:
 * provider billing period when both period dates are present (Freemius/provider Pro);
 * otherwise honest UTC calendar-month fallback (manual/admin Pro).
 *
 * Requires both currentPeriodStart and currentPeriodEnd — Settings pages must load both.
 */
export function getQuotaResetsSettingsMessage(input: {
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  now?: Date;
}): string {
  const start = toDateOrNull(input.currentPeriodStart);
  const end = toDateOrNull(input.currentPeriodEnd);
  const now = input.now ?? new Date();

  if (
    isUsableProviderBillingPeriod(
      { currentPeriodStart: start, currentPeriodEnd: end },
      now,
    )
  ) {
    return QUOTA_RESETS_WITH_BILLING_PERIOD_MESSAGE;
  }

  // Both provider dates present and ordered → billing-period copy (Settings honesty
  // when access is still shown via currentPeriodEnd, including cancel-at-period-end).
  if (start && end && start.getTime() < end.getTime()) {
    return QUOTA_RESETS_WITH_BILLING_PERIOD_MESSAGE;
  }

  return QUOTA_RESETS_SEPARATELY_MESSAGE;
}

/** Billing-period end for Settings (human-readable UTC date). */
export function formatSubscriptionAccessDate(isoDate: string): string {
  return formatHumanUtcDate(isoDate);
}

export function getPostCheckoutMessage(
  isPro: boolean,
  checkoutStatus: string | boolean | null,
): string | null {
  // Backward compatible: boolean true means success (legacy tests / Paddle).
  const status =
    checkoutStatus === true
      ? "success"
      : checkoutStatus === false || checkoutStatus === null
        ? null
        : checkoutStatus;

  if (status === "cancelled") {
    return CHECKOUT_CANCELLED_MESSAGE;
  }
  if (isPro) return PRO_ACTIVE_MESSAGE;
  if (status === "success") return CHECKOUT_PENDING_MESSAGE;
  return null;
}

export function shouldShowPaddlePortalActions(input: {
  isPro: boolean;
  isBillingConfigured: boolean;
  billingProvider: BillingProvider | null;
  subscriptionProvider?: string | null;
}): boolean {
  const provider = input.subscriptionProvider ?? input.billingProvider;
  return (
    input.isPro &&
    input.isBillingConfigured &&
    provider === "paddle"
  );
}

export function shouldShowStripePortalActions(input: {
  isPro: boolean;
  isBillingConfigured: boolean;
  billingProvider: BillingProvider | null;
  subscriptionProvider?: string | null;
}): boolean {
  const provider = input.subscriptionProvider ?? input.billingProvider;
  return (
    input.isPro &&
    input.isBillingConfigured &&
    provider === "stripe"
  );
}

/**
 * Freemius portal only when subscription is linked to Freemius.
 * Never falls back to Paddle/Stripe for Freemius users or vice versa.
 */
export function shouldShowFreemiusPortalActions(input: {
  isPro: boolean;
  subscriptionProvider: string | null | undefined;
  hasFreemiusIds: boolean;
}): boolean {
  return (
    input.isPro &&
    input.subscriptionProvider === "freemius" &&
    input.hasFreemiusIds
  );
}

interface SubscriptionInfo {
  status: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: BillingProvider | null;
  freemiusUserId?: string | null;
  freemiusLicenseId?: string | null;
  freemiusSubscriptionId?: string | null;
}

interface SubscriptionManagerProps {
  plan: Plan;
  subscription: SubscriptionInfo | null;
  isBillingConfigured: boolean;
  billingProvider: BillingProvider | null;
  /** When true, Free users see Freemius upgrade CTAs instead of only pricing link. */
  publicCheckoutEnabled?: boolean;
}

function SubscriptionManagerContent({
  plan,
  subscription,
  isBillingConfigured,
  billingProvider,
  publicCheckoutEnabled = false,
}: SubscriptionManagerProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const [loadingAction, setLoadingAction] = useState<
    "update" | "cancel" | "stripe" | "freemius" | "monthly" | "annual" | null
  >(null);
  const [message, setMessage] = useState("");

  const isPro =
    plan === PLANS.PRO || session?.user?.plan === PLANS.PRO;
  const postCheckoutMessage = getPostCheckoutMessage(isPro, checkoutStatus);
  const subscriptionProvider = subscription?.provider ?? null;
  const hasFreemiusIds = Boolean(
    subscription?.freemiusUserId ||
      subscription?.freemiusLicenseId ||
      subscription?.freemiusSubscriptionId,
  );

  const showPaddlePortalActions = shouldShowPaddlePortalActions({
    isPro,
    isBillingConfigured,
    billingProvider,
    subscriptionProvider,
  });
  const showStripePortalActions = shouldShowStripePortalActions({
    isPro,
    isBillingConfigured,
    billingProvider,
    subscriptionProvider,
  });
  const showFreemiusPortalActions = shouldShowFreemiusPortalActions({
    isPro,
    subscriptionProvider,
    hasFreemiusIds,
  });

  useEffect(() => {
    if (checkoutStatus === "success") {
      update().then((updatedSession) => {
        if (
          plan === PLANS.PRO ||
          updatedSession?.user?.plan === PLANS.PRO
        ) {
          // Stay on billing page; do not treat query as granting Pro.
          router.replace("/settings/billing", { scroll: false });
        }
        router.refresh();
      });
    }
  }, [checkoutStatus, plan, update, router]);

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

  async function handleFreemiusPortal() {
    setLoadingAction("freemius");
    setMessage("");
    try {
      const response = await fetch("/api/freemius/portal", { method: "POST" });
      const data = (await response.json()) as {
        portalUrl?: string;
        error?: string;
        code?: string;
      };
      setLoadingAction(null);

      if (!response.ok || !data.portalUrl) {
        setMessage(
          data.error ??
            (data.code === "freemius_subscription_not_found"
              ? FREEMIUS_PORTAL_UNAVAILABLE_MESSAGE
              : "Unable to open Freemius billing portal."),
        );
        return;
      }

      window.location.href = data.portalUrl;
    } catch {
      setLoadingAction(null);
      setMessage("Unable to open Freemius billing portal.");
    }
  }

  async function handleFreemiusCheckout(interval: "monthly" | "annual") {
    setLoadingAction(interval);
    setMessage("");
    try {
      const body = buildFreemiusCheckoutRequestBody(interval);
      const response = await fetch("/api/freemius/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as FreemiusCheckoutApiResponse;
      const result = resolveFreemiusCheckoutRedirect(data, response.ok);
      setLoadingAction(null);

      if (result.type === "redirect") {
        window.location.href = result.url;
        return;
      }
      setMessage(result.message);
    } catch {
      setLoadingAction(null);
      setMessage("Checkout failed. Please try again.");
    }
  }

  const isCancelled = checkoutStatus === "cancelled";
  const bannerClass = isCancelled
    ? "mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
    : "mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";

  return (
    <div id="subscription" className="rounded-xl border border-border p-6">
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
          {subscription.cancelAtPeriodEnd && " (cancels at end of period)"}
        </p>
      )}

      {subscription?.provider && (
        <p className="mt-1 text-xs text-muted-foreground">
          Billing provider: {subscription.provider}
        </p>
      )}

      {subscription?.currentPeriodEnd && (
        <p className="mt-1 text-xs text-muted-foreground">
          Access active until{" "}
          {formatSubscriptionAccessDate(subscription.currentPeriodEnd)}
        </p>
      )}

      {isPro && (
        <p className="mt-1 text-xs text-muted-foreground">
          {getQuotaResetsSettingsMessage({
            currentPeriodStart: subscription?.currentPeriodStart,
            currentPeriodEnd: subscription?.currentPeriodEnd,
          })}
        </p>
      )}

      {(postCheckoutMessage || message) && (
        <p className={bannerClass}>{message || postCheckoutMessage}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!isPro && publicCheckoutEnabled && (
          <>
            <button
              type="button"
              onClick={() => handleFreemiusCheckout("monthly")}
              disabled={loadingAction !== null}
              className={buttonVariants({
                size: "sm",
                className: "disabled:opacity-50",
              })}
            >
              {loadingAction === "monthly"
                ? "Opening..."
                : freemiusPricingDisplay.monthlyCtaLabel}
            </button>
            <button
              type="button"
              onClick={() => handleFreemiusCheckout("annual")}
              disabled={loadingAction !== null}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "disabled:opacity-50",
              })}
            >
              {loadingAction === "annual"
                ? "Opening..."
                : freemiusPricingDisplay.annualCtaLabel}
            </button>
          </>
        )}

        {!isPro && !publicCheckoutEnabled && isBillingConfigured && (
          <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
            Upgrade to Pro
          </Link>
        )}

        {!isPro && !publicCheckoutEnabled && !isBillingConfigured && (
          <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
            View pricing
          </Link>
        )}

        {showPaddlePortalActions && (
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

        {showStripePortalActions && (
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

        {showFreemiusPortalActions && (
          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={() => handleFreemiusPortal()}
              disabled={loadingAction !== null}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "disabled:opacity-50",
              })}
            >
              {loadingAction === "freemius"
                ? "Opening..."
                : FREEMIUS_PORTAL_BUTTON_LABEL}
            </button>
            <p className="text-xs text-muted-foreground">
              {FREEMIUS_PORTAL_HELPER_MESSAGE}
            </p>
          </div>
        )}

        {isPro &&
          subscriptionProvider === "freemius" &&
          !hasFreemiusIds && (
            <p className="w-full text-xs text-muted-foreground">
              {FREEMIUS_PORTAL_UNAVAILABLE_MESSAGE}
            </p>
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
