import { PaddleApiError, paddleApiFetch } from "@/lib/paddle/client";

export type PaddleCancellationResult = "canceled" | "already_canceled";

const ALREADY_CANCELED_ERROR_CODES = new Set([
  "subscription_is_canceled_action_invalid",
  "subscription_update_when_canceled",
]);

export async function cancelPaddleSubscriptionImmediately(
  subscriptionId: string,
): Promise<PaddleCancellationResult> {
  try {
    const response = await paddleApiFetch<{
      data?: { id?: string; status?: string };
    }>(`/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ effective_from: "immediately" }),
    });

    if (
      response.data?.id !== subscriptionId ||
      response.data.status !== "canceled"
    ) {
      throw new Error("Paddle did not confirm immediate cancellation");
    }

    return "canceled";
  } catch (error) {
    if (
      error instanceof PaddleApiError &&
      error.status === 400 &&
      ALREADY_CANCELED_ERROR_CODES.has(error.code)
    ) {
      return "already_canceled";
    }

    throw error;
  }
}
