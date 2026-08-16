"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppSumoRedeemForm({
  disabled,
  initialTier,
}: {
  disabled?: boolean;
  initialTier: 0 | 1 | 2;
}) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tier, setTier] = useState(initialTier);

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
        {pending ? "Redeeming…" : "Redeem code"}
      </Button>
      {message ? (
        <p className="text-sm text-foreground">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
