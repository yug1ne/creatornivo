"use client";

import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils/cn";

interface SignOutButtonProps {
  className?: string;
  onNavigate?: () => void;
}

export function SignOutButton({ className, onNavigate }: SignOutButtonProps) {
  async function handleSignOut() {
    if (!window.confirm("Sign out of your account?")) return;

    onNavigate?.();
    await signOut({ redirectTo: "/" });
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-xs"
        aria-hidden
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </span>
      Sign out
    </button>
  );
}