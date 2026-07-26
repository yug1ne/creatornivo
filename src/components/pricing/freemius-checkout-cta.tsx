"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { freemiusPricingDisplay } from "@/config/freemius-pricing-display";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type CheckoutInterval = "monthly" | "annual";
type LoadingKey = "monthly" | "annual" | "founding" | null;

export type FreemiusCheckoutApiResponse = {
  checkoutUrl?: string;
  mode?: string;
  error?: string;
  code?: string;
};

/**
 * Pure helper for tests and client: build POST body for Freemius checkout.
 * Never mutates plan. Coupon only when founding offer is selected.
 */
export function buildFreemiusCheckoutRequestBody(
  interval: CheckoutInterval,
  options?: { founding?: boolean },
): { interval: CheckoutInterval; coupon?: string } {
  if (options?.founding && interval === "monthly") {
    return {
      interval: "monthly",
      coupon: freemiusPricingDisplay.foundingCouponCode,
    };
  }
  return { interval };
}

export function resolveFreemiusCheckoutRedirect(
  data: FreemiusCheckoutApiResponse,
  ok: boolean,
): { type: "redirect"; url: string } | { type: "error"; message: string } {
  if (ok && data.checkoutUrl) {
    return { type: "redirect", url: data.checkoutUrl };
  }
  if (data.code === "checkout_disabled") {
    return {
      type: "error",
      message: freemiusPricingDisplay.checkoutDisabledMessage,
    };
  }
  return {
    type: "error",
    message: data.error ?? "Checkout failed. Please try again.",
  };
}

interface FreemiusCheckoutCtaProps {
  className?: string;
  size?: "md" | "lg";
  /** When true, show founding monthly CTA that auto-applies FOUNDING20. */
  showFoundingOffer?: boolean;
}

/**
 * Public Freemius checkout CTAs. Only mount when PUBLIC_CHECKOUT_ENABLED.
 * Does not grant Pro; opens hosted Freemius checkout URL from the API.
 */
export function FreemiusCheckoutCta({
  className,
  size = "md",
  showFoundingOffer = true,
}: FreemiusCheckoutCtaProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<LoadingKey>(null);
  const [error, setError] = useState("");

  async function startCheckout(
    key: LoadingKey,
    interval: CheckoutInterval,
    founding?: boolean,
  ) {
    setError("");
    setLoading(key);

    try {
      const body = buildFreemiusCheckoutRequestBody(interval, { founding });
      const response = await fetch("/api/freemius/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as FreemiusCheckoutApiResponse;
      const result = resolveFreemiusCheckoutRedirect(data, response.ok);

      if (result.type === "redirect") {
        window.location.href = result.url;
        return;
      }

      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/pricing";
        return;
      }

      setError(result.message);
    } catch {
      setError("Checkout failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (status === "loading") {
    return (
      <div className={cn("mt-6", className)}>
        <button
          type="button"
          disabled
          className={buttonVariants({
            className: "w-full opacity-60",
            size,
          })}
        >
          Loading...
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={cn("mt-6 space-y-3", className)}>
        <Link
          href="/login?callbackUrl=/pricing"
          className={buttonVariants({ className: "w-full", size })}
        >
          Sign in to get Pro
        </Link>
        <p className="text-center text-xs text-muted-foreground">
          {freemiusPricingDisplay.foundingOfferCopy}
        </p>
      </div>
    );
  }

  if (session.user?.plan === "pro") {
    return (
      <Link
        href="/settings/billing"
        className={cn(
          "mt-6 block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
          className,
        )}
      >
        ✓ You have active Pro — manage billing
      </Link>
    );
  }

  return (
    <div className={cn("mt-6 space-y-3", className)}>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => startCheckout("monthly", "monthly")}
        className={buttonVariants({ className: "w-full", size })}
      >
        {loading === "monthly"
          ? "Opening checkout..."
          : freemiusPricingDisplay.monthlyCtaLabel}
      </button>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => startCheckout("annual", "annual")}
        className={buttonVariants({
          variant: "outline",
          className: "w-full",
          size,
        })}
      >
        {loading === "annual"
          ? "Opening checkout..."
          : freemiusPricingDisplay.annualCtaLabel}
      </button>
      {showFoundingOffer ? (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => startCheckout("founding", "monthly", true)}
          className={buttonVariants({
            variant: "secondary",
            className: "w-full",
            size,
          })}
        >
          {loading === "founding"
            ? "Opening checkout..."
            : freemiusPricingDisplay.foundingCtaLabel}
        </button>
      ) : null}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {freemiusPricingDisplay.foundingOfferCopy} Coupon is applied at
        checkout for the founding offer only.
      </p>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {freemiusPricingDisplay.activationNote}
      </p>
      {error ? (
        <p className="text-center text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
