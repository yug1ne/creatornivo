"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function getFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const match = header.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

export function PrivacySettings() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleExport(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/account/export-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
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

      setMessage("Your data export download has started.");
      setPassword("");
    } catch {
      setError("Failed to export account data");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <CardTitle className="text-base">Privacy &amp; Data</CardTitle>
          <CardDescription className="mt-1">
            Download a JSON copy of your account profile, library, generations,
            usage records, and billing metadata.
          </CardDescription>
        </div>

        {error && (
          <div className="rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-foreground">
            {message}
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password to confirm"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Preparing export..." : "Download my data"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Password hashes, session tokens, and OAuth secrets are excluded. Learn
          more in our{" "}
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