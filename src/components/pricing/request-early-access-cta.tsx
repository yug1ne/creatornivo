"use client";

import { useSession } from "next-auth/react";

import {
  ADMIN_CHECKOUT_BLOCKED_MESSAGE,
  isAdminCheckoutSessionUser,
} from "@/components/pricing/freemius-checkout-cta";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/** Public CTA while self-serve checkout remains behind PUBLIC_CHECKOUT_ENABLED. */
export const REQUEST_EARLY_ACCESS_MAILTO =
  `mailto:${siteConfig.legal.billingEmail}?subject=CreatorNivo%20Early%20Access`;

export const REQUEST_EARLY_ACCESS_LABEL = "Request Early Access";

export const PAID_CHECKOUT_UNAVAILABLE_NOTE =
  "Founding access is available by request while we finish final rollout.";

interface RequestEarlyAccessCtaProps {
  className?: string;
  /** Match landing Pro card large button when needed. */
  size?: "md" | "lg";
}

/**
 * UI-only Pro CTA: mailto support. Does not open Paddle/Stripe checkout.
 * Backend billing routes remain intact for later re-enable.
 */
export function RequestEarlyAccessCta({
  className,
  size = "md",
}: RequestEarlyAccessCtaProps) {
  const { data: session } = useSession();

  if (isAdminCheckoutSessionUser(session?.user)) {
    return (
      <p className={cn("mt-6 text-center text-sm text-muted-foreground", className)}>
        {ADMIN_CHECKOUT_BLOCKED_MESSAGE}
      </p>
    );
  }

  return (
    <div className={cn("mt-6", className)}>
      <a
        href={REQUEST_EARLY_ACCESS_MAILTO}
        className={buttonVariants({ className: "w-full", size })}
      >
        {REQUEST_EARLY_ACCESS_LABEL}
      </a>
      <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        {PAID_CHECKOUT_UNAVAILABLE_NOTE}
      </p>
    </div>
  );
}
