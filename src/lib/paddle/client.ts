import { paddleConfig } from "@/config/paddle";

export class PaddleApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PaddleApiError";
  }
}

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

  let payload: T & {
    error?: { code?: string; detail?: string; message?: string };
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    payload = {} as typeof payload;
  }

  if (!response.ok) {
    const message =
      payload.error?.detail ??
      payload.error?.message ??
      `Paddle API error (${response.status})`;
    throw new PaddleApiError(
      response.status,
      payload.error?.code ?? "paddle_api_error",
      message,
    );
  }

  return payload;
}
