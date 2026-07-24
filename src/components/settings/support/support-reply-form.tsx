"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SUPPORT_BODY_MAX_LENGTH } from "@/config/support";

export function SupportReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/support/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not send reply");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? (
        <div className="rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <label htmlFor="support-reply" className="sr-only">
        Reply
      </label>
      <textarea
        id="support-reply"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
        maxLength={SUPPORT_BODY_MAX_LENGTH}
        rows={4}
        disabled={isLoading}
        placeholder="Write a reply…"
        className="w-full rounded-[var(--radius-md)] border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" disabled={isLoading} size="sm">
        {isLoading ? "Sending..." : "Send reply"}
      </Button>
    </form>
  );
}
