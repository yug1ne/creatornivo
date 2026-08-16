"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const APPSUMO_REDEEM_SUCCESS_REDIRECT_HREF = "/dashboard";
export const APPSUMO_REDEEM_SUCCESS_REDIRECT_DELAY_MS = 1600;

export function AppSumoRedeemForm({
  disabled,
  initialTier,
  submitLabel = "Redeem code",
}: {
  disabled?: boolean;
  initialTier: 0 | 1 | 2;
  submitLabel?: string;
}) {
  const router = useRouter();
  const redirectTimerRef = useRef<number | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tier, setTier] = useState(initialTier);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/appsumo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as {
        message?: string;
        activeCodeCount?: number | null;
      };
      if (!response.ok) {
        setError(
          data.message ??
            "This code is unavailable or has already been redeemed.",
        );
        return;
      }
      setMessage(data.message ?? "AppSumo access is connected.");
      if (data.activeCodeCount === 1 || data.activeCodeCount === 2) {
        setTier(data.activeCodeCount);
      }
      setCode("");
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = window.setTimeout(() => {
        router.push(APPSUMO_REDEEM_SUCCESS_REDIRECT_HREF);
      }, APPSUMO_REDEEM_SUCCESS_REDIRECT_DELAY_MS);
    } catch {
      setError("Unable to redeem this code right now. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
      <label className="block text-sm font-medium text-foreground">
        AppSumo code
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="mt-2"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled || pending || tier >= 2}
          required
        />
      </label>
      <Button
        type="submit"
        className="w-full"
        disabled={disabled || pending || tier >= 2 || !code.trim()}
      >
        {pending ? "Redeeming…" : submitLabel}
      </Button>
      {message ? (
        <p className="text-sm text-foreground">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
