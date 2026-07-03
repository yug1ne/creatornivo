export const paddleConfig = {
  clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "",
  proPriceId: process.env.PADDLE_PRO_PRICE_ID ?? "",
  earlyAccessPriceId: process.env.PADDLE_EARLY_ACCESS_PRICE_ID ?? "",
  environment:
    (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox") as
      | "sandbox"
      | "production",
} as const;

export interface PaddleServerCheckoutConfig {
  clientToken: string;
  environment: "sandbox" | "production";
  environmentConfigured: boolean;
  apiKey: string;
  webhookSecret: string;
  proPriceId: string;
  earlyAccessPriceId: string;
}

export function getPaddleServerCheckoutConfig(): PaddleServerCheckoutConfig {
  const configuredEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;

  return {
    clientToken: paddleConfig.clientToken,
    environment: paddleConfig.environment,
    environmentConfigured:
      configuredEnvironment === "sandbox" ||
      configuredEnvironment === "production",
    apiKey: process.env.PADDLE_API_KEY ?? "",
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? "",
    proPriceId: paddleConfig.proPriceId,
    earlyAccessPriceId: paddleConfig.earlyAccessPriceId,
  };
}

export function getAllowedPaddlePriceIds(
  config = getPaddleServerCheckoutConfig(),
): Set<string> {
  return new Set(
    [config.proPriceId, config.earlyAccessPriceId].filter(isPaddlePriceId),
  );
}

export function isPaddlePriceId(value: string): boolean {
  return /^pri_[a-z0-9]+$/i.test(value);
}

export function isAllowedPaddlePriceId(
  priceId: string,
  config = getPaddleServerCheckoutConfig(),
): boolean {
  return getAllowedPaddlePriceIds(config).has(priceId);
}

export function isPaddleServerCheckoutConfigured(
  selectedPriceId: string,
  config = getPaddleServerCheckoutConfig(),
): boolean {
  return Boolean(
    config.environmentConfigured &&
      config.clientToken &&
      config.apiKey &&
      config.webhookSecret &&
      config.proPriceId &&
      selectedPriceId &&
      isAllowedPaddlePriceId(selectedPriceId, config),
  );
}

export function isPaddleCheckoutConfigured(): boolean {
  const config = getPaddleServerCheckoutConfig();
  return isPaddleServerCheckoutConfigured(
    config.earlyAccessPriceId || config.proPriceId,
    config,
  );
}

export function isPaddleConfigured(): boolean {
  return isPaddleCheckoutConfigured();
}
