"use client";

import {
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PaddleCheckoutConfig {
  clientToken: string;
  environment: "sandbox" | "production";
  priceId: string;
  userId: string;
  email: string;
  successUrl: string;
}

let paddleInitPromise: Promise<Paddle | undefined> | null = null;

async function getPaddleInstance(
  clientToken: string,
  environment: "sandbox" | "production",
  onEvent?: (event: PaddleEventData) => void,
) {
  if (!paddleInitPromise) {
    paddleInitPromise = initializePaddle({
      token: clientToken,
      environment,
      eventCallback: onEvent,
    });
  }

  return paddleInitPromise;
}

export function usePaddleCheckout() {
  const { update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const openedRef = useRef(false);

  const handleCheckoutEvent = useCallback(
    async (event: PaddleEventData) => {
      if (event.name === "checkout.completed") {
        await update();
      }
    },
    [update],
  );

  useEffect(() => {
    return () => {
      openedRef.current = false;
    };
  }, []);

  const openCheckout = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/paddle/checkout");
      const data = (await response.json()) as PaddleCheckoutConfig & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start checkout");
      }

      const paddle = await getPaddleInstance(
        data.clientToken,
        data.environment,
        handleCheckoutEvent,
      );

      if (!paddle) {
        throw new Error("Paddle failed to initialize");
      }

      openedRef.current = true;

      paddle.Checkout.open({
        items: [{ priceId: data.priceId, quantity: 1 }],
        customer: data.email ? { email: data.email } : undefined,
        customData: { userId: data.userId },
        settings: {
          displayMode: "overlay",
          theme: "light",
          locale: "en",
          successUrl: data.successUrl,
        },
      });
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Failed to open checkout",
      );
    } finally {
      setIsLoading(false);
    }
  }, [handleCheckoutEvent]);

  return { openCheckout, isLoading, error };
}