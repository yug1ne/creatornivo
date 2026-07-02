import { paddleConfig } from "@/config/paddle";

function getPaddleApiBaseUrl(): string {
  return paddleConfig.environment === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export async function paddleApiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;

  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not configured");
  }

  const response = await fetch(`${getPaddleApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const payload = (await response.json()) as T & {
    error?: { detail?: string; message?: string };
  };

  if (!response.ok) {
    const message =
      payload.error?.detail ??
      payload.error?.message ??
      `Paddle API error (${response.status})`;
    throw new Error(message);
  }

  return payload;
}