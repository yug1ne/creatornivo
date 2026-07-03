"use client";

import {
  initializePaddle,
  type CheckoutOpenOptions,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PaddleCheckoutConfig {
  clientToken: string;
  environment: "sandbox" | "production";
  transactionId: string;
}

export interface CheckoutErrorPayload {
  error?: string;
  code?: string;
  portalUrl?: string;
}

export function createPaddleCheckoutOptions(
  transactionId: string,
  email: string | null | undefined,
  origin: string,
): CheckoutOpenOptions {
  return {
    transactionId,
    ...(email ? { customer: { email } } : {}),
    settings: {
      displayMode: "overlay",
      theme: "light",
      locale: "en",
      successUrl: `${origin}/settings?checkout=success`,
    },
  };
}

export function mapCheckoutError(
  status: number,
  payload: CheckoutErrorPayload,
): { code: string; message: string; redirectTo?: string } {
  if (status === 401 || payload.code === "unauthorized") {
    return {
      code: "session_expired",
      message: "Your session has expired. Please sign in again.",
    };
  }
  if (payload.code === "subscription_already_active") {
    return {
      code: payload.code,
      message: "Your Pro subscription is already active.",
    };
  }
  if (payload.code === "checkout_in_progress") {
    return {
      code: payload.code,
      message: "A checkout is already in progress. Please try again shortly.",
    };
  }
  if (payload.code === "subscription_requires_action") {
    return {
      code: payload.code,
      message: "Your subscription requires attention in Settings.",
      redirectTo: payload.portalUrl ?? "/settings",
    };
  }
  if (status === 503 || payload.code === "billing_not_configured") {
    return {
      code: "billing_not_configured",
      message: "Billing is temporarily unavailable. Please try again later.",
    };
  }
  if (payload.code === "paddle_forbidden") {
    return {
      code: payload.code,
      message:
        "Billing permissions are temporarily unavailable. Please contact support.",
    };
  }
  return {
    code: payload.code ?? "checkout_failed",
    message: payload.error ?? "Failed to create checkout.",
  };
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
  const { data: session, update } = useSession();
  const sessionEmail = session?.user?.email;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const openedRef = useRef(false);
  const inFlightRef = useRef(false);

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
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError("");
    setErrorCode("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/paddle/checkout", {
        method: "POST",
        credentials: "same-origin",
      });
      let data: PaddleCheckoutConfig & CheckoutErrorPayload;
      try {
        data = (await response.json()) as typeof data;
      } catch {
        data = {} as typeof data;
      }

      if (!response.ok) {
        const mapped = mapCheckoutError(response.status, data);
        if (mapped.redirectTo) {
          window.location.href = mapped.redirectTo;
          return;
        }
        setError(mapped.message);
        setErrorCode(mapped.code);
        return;
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

      paddle.Checkout.open(
        createPaddleCheckoutOptions(
          data.transactionId,
          sessionEmail,
          window.location.origin,
        ),
      );
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Failed to open checkout",
      );
      setErrorCode("network_error");
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [handleCheckoutEvent, sessionEmail]);

  return { openCheckout, isLoading, error, errorCode };
}
