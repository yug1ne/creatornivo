"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";

type ActivationResponse = {
  status?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  error?: string;
};

function formatTrialEnd(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TrialActivationClient() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [result, setResult] = useState<ActivationResponse | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void fetch("/api/trial/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as ActivationResponse;
        setResult(data);
        if (response.ok) router.refresh();
      })
      .catch(() => {
        setResult({ error: "Trial activation failed. Please try again." });
      });
  }, [router]);

  const endLabel = formatTrialEnd(result?.trialEndsAt);
  const active =
    result?.status === "activated" || result?.status === "already_active";

  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <p className="text-sm font-medium text-primary">Private invitation</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        Trial activation
      </h1>

      {!result ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Activating your trial…
        </p>
      ) : active ? (
        <div className="mt-6 rounded-[var(--radius-md)] bg-success/10 px-4 py-3 text-sm text-foreground">
          Your trial is active{endLabel ? ` until ${endLabel}` : ""}.
        </div>
      ) : result.status === "pending_verification" ? (
        <div className="mt-6 rounded-[var(--radius-md)] bg-warning/10 px-4 py-3 text-sm text-foreground">
          Your invitation is reserved. Verify your email to start the 72-hour
          trial.
        </div>
      ) : result.status === "paid_pro" ? (
        <div className="mt-6 rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-foreground">
          Your paid Pro subscription is already active, so no trial was started.
        </div>
      ) : (
        <div className="mt-6 rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error ??
            (result.status === "already_used"
              ? "This account has already used its trial."
              : "This invitation is unavailable.")}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/generate" className={buttonVariants()}>
          Open Generate
        </Link>
        <Link
          href="/settings"
          className={buttonVariants({ variant: "outline" })}
        >
          Settings
        </Link>
      </div>
    </section>
  );
}
