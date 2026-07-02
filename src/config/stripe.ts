export const stripeConfig = {
  proPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
} as const;

export function isStripeCheckoutConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && stripeConfig.proPriceId,
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(
    isStripeCheckoutConfigured() && process.env.STRIPE_WEBHOOK_SECRET,
  );
}