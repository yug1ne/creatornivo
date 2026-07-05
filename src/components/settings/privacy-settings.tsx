"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BillingProvider } from "@/config/billing";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "@/lib/privacy/account-deletion-constants";

function getFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const match = header.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

interface PrivacySettingsProps {
  isBillingConfigured: boolean;
  billingProvider: BillingProvider | null;
}

export function PrivacySettings({
  isBillingConfigured,
  billingProvider,
}: PrivacySettingsProps) {
  const router = useRouter();

  const [exportPassword, setExportPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [exportError, setExportError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [showSubscriptionAction, setShowSubscriptionAction] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  async function handleExport(event: React.FormEvent) {
    event.preventDefault();
    setExportError("");
    setExportMessage("");
    setIsExporting(true);

    try {
      const response = await fetch("/api/account/export-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: exportPassword }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setExportError(
          typeof data.error === "string"
            ? data.error
            : "Failed to export account data",
        );
        return;
      }

      const blob = await response.blob();
      const filename =
        getFilenameFromDisposition(
          response.headers.get("Content-Disposition"),
        ) ?? "creatornivo-data-export.json";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);

      setExportMessage("Your data export download has started.");
      setExportPassword("");
    } catch {
      setExportError("Failed to export account data");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleCancelSubscription() {
    setIsOpeningPortal(true);
    setDeleteError("");

    const endpoint =
      billingProvider === "paddle"
        ? "/api/paddle/portal"
        : billingProvider === "stripe"
          ? "/api/stripe/portal"
          : null;

    if (!endpoint) {
      setDeleteError("Subscription management is unavailable.");
      setIsOpeningPortal(false);
      return;
    }

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error ?? "Failed to open subscription management.");
        return;
      }

      const url = data.cancelSubscriptionUrl ?? data.url;
      if (!url) {
        setDeleteError("Cancel subscription link is unavailable.");
        return;
      }

      window.location.href = url;
    } catch {
      setDeleteError("Failed to open subscription management.");
    } finally {
      setIsOpeningPortal(false);
    }
  }

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    setDeleteError("");
    setShowSubscriptionAction(false);
    setIsDeleting(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDeleteError(
          typeof data.error === "string"
            ? data.error
            : "Failed to delete account",
        );
        if (data.manageSubscription) {
          setShowSubscriptionAction(true);
        }
        return;
      }

      await signOut({ redirect: false });
      router.push("/?accountDeleted=1");
      router.refresh();
    } catch {
      setDeleteError("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <CardTitle className="text-base">Privacy &amp; Data</CardTitle>
          <CardDescription className="mt-1">
            Export your personal data or permanently delete your account.
          </CardDescription>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Export data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Download a JSON copy of your account profile, library, generations,
              usage records, and billing metadata.
            </p>
          </div>

          {exportError && (
            <div className="rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {exportError}
            </div>
          )}

          {exportMessage && (
            <div className="rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-foreground">
              {exportMessage}
            </div>
          )}

          <form onSubmit={handleExport} className="space-y-4">
            <div>
              <label
                htmlFor="export-password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Current password
              </label>
              <Input
                id="export-password"
                type="password"
                value={exportPassword}
                onChange={(event) => setExportPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password to confirm"
              />
            </div>

            <Button type="submit" disabled={isExporting} className="w-full">
              {isExporting ? "Preparing export..." : "Download my data"}
            </Button>
          </form>
        </div>

        <div className="border-t border-border pt-6">
          <div>
            <h3 className="text-sm font-medium text-foreground">Delete account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete your account and associated personal data. This
              action cannot be undone.
            </p>
          </div>

          {deleteError && (
            <div className="mt-4 rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          {showSubscriptionAction && isBillingConfigured && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleCancelSubscription()}
                disabled={isOpeningPortal}
                className={buttonVariants({ size: "sm" })}
              >
                {isOpeningPortal ? "Loading..." : "Cancel subscription"}
              </button>
              <Link href="/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Subscription settings
              </Link>
            </div>
          )}

          <form onSubmit={handleDelete} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="delete-password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Current password
              </label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password to confirm"
              />
            </div>

            <div>
              <label
                htmlFor="delete-confirmation"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Type {ACCOUNT_DELETION_CONFIRMATION_TEXT} to confirm
              </label>
              <Input
                id="delete-confirmation"
                type="text"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                required
                autoComplete="off"
                placeholder={ACCOUNT_DELETION_CONFIRMATION_TEXT}
              />
            </div>

            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting}
              className="w-full"
            >
              {isDeleting ? "Deleting account..." : "Delete account"}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground">
          Password hashes, session tokens, and OAuth secrets are excluded from
          exports. Limited billing records may be retained after deletion where
          required by law. Learn more in our{" "}
          <Link
            href="/privacy#user-rights"
            className="font-medium text-primary hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}