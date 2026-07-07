"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface SignOutButtonProps {
  className?: string;
  onNavigate?: () => void;
}

export function SignOutButton({ className, onNavigate }: SignOutButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!confirmOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  async function handleConfirmSignOut() {
    setConfirmOpen(false);
    onNavigate?.();
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
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

      {mounted &&
        confirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
              aria-label="Close sign out dialog"
              onClick={() => setConfirmOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sign-out-dialog-title"
              className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow-md)]"
            >
              <h2
                id="sign-out-dialog-title"
                className="text-lg font-semibold text-foreground"
              >
                Sign out of Creatornivo?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You will need to sign in again to access your dashboard and
                library.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleConfirmSignOut()}
                >
                  Sign out
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}