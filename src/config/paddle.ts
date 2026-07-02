export const paddleConfig = {
  clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "",
  proPriceId: process.env.PADDLE_PRO_PRICE_ID ?? "",
  earlyAccessPriceId: process.env.PADDLE_EARLY_ACCESS_PRICE_ID ?? "",
  environment:
    (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox") as
      | "sandbox"
      | "production",
} as const;

export function isPaddleCheckoutConfigured(): boolean {
  return Boolean(
    paddleConfig.clientToken && paddleConfig.proPriceId,
  );
}

export function isPaddleConfigured(): boolean {
  return Boolean(
    isPaddleCheckoutConfigured() &&
      process.env.PADDLE_API_KEY &&
      process.env.PADDLE_WEBHOOK_SECRET,
  );
}