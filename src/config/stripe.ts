export const stripeConfig = {
  proPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  earlyAccessPriceId: process.env.STRIPE_EARLY_ACCESS_PRICE_ID ?? "",
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
} as const;

export function isStripeCheckoutConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && stripeConfig.proPriceId,
  );
}

export function isEarlyAccessStripeConfigured(): boolean {
  return Boolean(
    isStripeCheckoutConfigured() && stripeConfig.earlyAccessPriceId,
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(
    isStripeCheckoutConfigured() && process.env.STRIPE_WEBHOOK_SECRET,
  );
}