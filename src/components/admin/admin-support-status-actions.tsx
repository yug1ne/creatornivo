"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AdminSupportStatusActions({
  threadId,
  status,
}: {
  threadId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function run(action: "close" | "reopen") {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/support/threads/${threadId}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not update status");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status !== "closed" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => void run("close")}
          >
            Close thread
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => void run("reopen")}
          >
            Reopen thread
          </Button>
        )}
      </div>
    </div>
  );
}
