"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface UpgradeButtonProps {
  isConfigured: boolean;
  billingProvider: "paddle" | "stripe" | null;
  earlyAccessAvailable?: boolean;
  earlyAccessPrice?: string;
  className?: string;
}

export function UpgradeButton({
  isConfigured,
  billingProvider,
  earlyAccessAvailable = false,
  earlyAccessPrice = "$4.90",
  className,
}: UpgradeButtonProps) {
  const { data: session, status } = useSession();
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const { openCheckout, isLoading: paddleLoading, error: paddleError } =
    usePaddleCheckout();

  const isPro = session?.user?.plan === "pro";
  const isLoading = billingProvider === "paddle" ? paddleLoading : stripeLoading;
  const error = billingProvider === "paddle" ? paddleError : stripeError;

  const buttonLabel = isLoading
    ? "Opening checkout..."
    : earlyAccessAvailable
      ? `Get Pro — ${earlyAccessPrice}/mo`
      : "Upgrade to Pro";

  async function handleStripeUpgrade() {
    setStripeError("");
    setStripeLoading(true);

    const response = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await response.json();

    setStripeLoading(false);

    if (!response.ok) {
      setStripeError(data.error ?? "Failed to create checkout session");
      return;
    }

    window.location.href = data.url;
  }

  async function handleUpgrade() {
    if (billingProvider === "paddle") {
      await openCheckout();
      return;
    }

    await handleStripeUpgrade();
  }

  if (!isConfigured) {
    return (
      <p className={cn("mt-6 text-sm text-muted-foreground", className)}>
        Payments temporarily unavailable (billing not configured)
      </p>
    );
  }

  if (status === "loading") {
    return (
      <button
        type="button"
        disabled
        className={cn(
          buttonVariants({ className: "mt-6 w-full opacity-60" }),
          className,
        )}
      >
        Loading...
      </button>
    );
  }

  if (!session) {
    return (
      <Link
        href="/login?callbackUrl=/pricing"
        className={cn(buttonVariants({ className: "mt-6 w-full" }), className)}
      >
        Sign in to get Pro
      </Link>
    );
  }

  if (isPro) {
    return (
      <Link
        href="/settings"
        className={cn(
          "mt-6 block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
          className,
        )}
      >
        ✓ You have active Pro
      </Link>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isLoading}
        className={cn(buttonVariants({ className: "mt-6 w-full" }))}
      >
        {buttonLabel}
      </button>
      {billingProvider === "paddle" && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Secure checkout powered by Paddle · Sandbox test card: 4242 4242 4242
          4242
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
