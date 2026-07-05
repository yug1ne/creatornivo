"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function AccountDeletedBanner() {
  const searchParams = useSearchParams();
  const accountDeleted = searchParams.get("accountDeleted") === "1";

  if (!accountDeleted) {
    return null;
  }

  return (
    <div className="border-b border-border bg-muted">
      <div className="mx-auto max-w-6xl px-4 py-3 text-center text-sm text-foreground sm:px-6">
        Your account has been deleted. You can{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          create a new account
        </Link>{" "}
        or{" "}
        <Link href="/" className="font-medium text-primary hover:underline">
          return home
        </Link>
        .
      </div>
    </div>
  );
}