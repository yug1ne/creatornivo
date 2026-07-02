"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

interface UpgradeButtonProps {
  isConfigured: boolean;
}

export function UpgradeButton({ isConfigured }: UpgradeButtonProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isPro = session?.user?.plan === "pro";

  async function handleUpgrade() {
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await response.json();

    setIsLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to create checkout session");
      return;
    }

    window.location.href = data.url;
  }

  if (!isConfigured) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        Payments temporarily unavailable (Stripe not configured)
      </p>
    );
  }

  if (status === "loading") {
    return (
      <button
        type="button"
        disabled
        className="mt-6 w-full rounded-lg bg-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-500"
      >
        Loading...
      </button>
    );
  }

  if (!session) {
    return (
      <Link
        href="/login?callbackUrl=/pricing"
        className="mt-6 block w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Sign in to get Pro
      </Link>
    );
  }

  if (isPro) {
    return (
      <Link
        href="/settings"
        className="mt-6 block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      >
        ✓ You have active Pro
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isLoading}
        className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isLoading ? "Redirecting..." : "Upgrade to Pro"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}