"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import {
  freemiusFoundingOfferActive,
  freemiusPricingDisplay,
} from "@/config/freemius-pricing-display";
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

export type FreemiusCheckoutEligibility = {
  canCheckout: boolean;
  foundingEligible: boolean;
  reason: string | null;
};

export const ADMIN_CHECKOUT_BLOCKED_MESSAGE =
  "Admin accounts cannot purchase or upgrade to Pro.";

/**
 * Pure helper for tests and client: build POST body for Freemius checkout.
 * Never mutates plan. Coupon only when founding offer is selected.
 */
export function buildFreemiusCheckoutRequestBody(
  interval: CheckoutInterval,
  options?: { founding?: boolean },
): { interval: CheckoutInterval; founding?: true } {
  if (options?.founding && interval === "monthly") {
    return {
      interval: "monthly",
      founding: true,
    };
  }
  return { interval };
}

export function isAdminCheckoutSessionUser(
  user:
    | { role?: string | null; isAdmin?: boolean | null }
    | null
    | undefined,
): boolean {
  return user?.role === "admin" || user?.isAdmin === true;
}

export function useFreemiusCheckoutEligibility(enabled: boolean) {
  const [eligibility, setEligibility] =
    useState<FreemiusCheckoutEligibility | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    fetch("/api/freemius/checkout", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as FreemiusCheckoutEligibility;
      })
      .then((value) => {
        if (!controller.signal.aborted) {
          setEligibility(
            value ?? {
              canCheckout: false,
              foundingEligible: false,
              reason: "checkout_eligibility_unavailable",
            },
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          // Fail closed in UI; POST remains authoritative.
          setEligibility({
            canCheckout: false,
            foundingEligible: false,
            reason: "checkout_eligibility_unavailable",
          });
        }
      });

    return () => controller.abort();
  }, [enabled]);

  return {
    eligibility: enabled ? eligibility : null,
    loading: enabled && eligibility === null,
  };
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
  /**
   * When true and freemiusFoundingOfferActive, show founding primary + annual.
   * When false (or founding inactive), show regular monthly + annual.
   */
  showFoundingOffer?: boolean;
}

/**
 * Public Freemius checkout CTAs. Only mount when PUBLIC_CHECKOUT_ENABLED.
 * Buttons only — founding copy lives in section top + Pro price card.
 */
export function FreemiusCheckoutCta({
  className,
  size = "md",
  showFoundingOffer = true,
}: FreemiusCheckoutCtaProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<LoadingKey>(null);
  const [error, setError] = useState("");

  const isAdmin = isAdminCheckoutSessionUser(session?.user);
  const { eligibility, loading: eligibilityLoading } =
    useFreemiusCheckoutEligibility(Boolean(session && !isAdmin));
  const foundingPrimary =
    showFoundingOffer &&
    freemiusFoundingOfferActive &&
    eligibility?.foundingEligible === true;

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

  if (isAdmin || eligibility?.reason === "admin_checkout_forbidden") {
    return (
      <p className={cn("mt-6 text-center text-sm text-muted-foreground", className)}>
        {ADMIN_CHECKOUT_BLOCKED_MESSAGE}
      </p>
    );
  }

  if (eligibilityLoading || !eligibility) {
    return (
      <div className={cn("mt-6", className)}>
        <button
          type="button"
          disabled
          className={buttonVariants({ className: "w-full opacity-60", size })}
        >
          Checking checkout eligibility...
        </button>
      </div>
    );
  }

  if (!eligibility.canCheckout) {
    return (
      <p className={cn("mt-6 text-center text-sm text-muted-foreground", className)}>
        Checkout is unavailable for this account.
      </p>
    );
  }

  return (
    <div className={cn("mt-6 space-y-3", className)}>
      {foundingPrimary ? (
        <>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => startCheckout("founding", "monthly", true)}
            className={buttonVariants({ className: "w-full", size })}
          >
            {loading === "founding"
              ? "Opening checkout..."
              : freemiusPricingDisplay.foundingCtaLabel}
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
        </>
      ) : (
        <>
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
        </>
      )}
      {error ? (
        <p className="text-center text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
