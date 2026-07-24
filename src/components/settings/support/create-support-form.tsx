"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SUPPORT_BODY_MAX_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
} from "@/config/support";

export function CreateSupportForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/support/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not create support request");
        return;
      }

      if (data.id) {
        router.push(`/settings/support/${data.id}`);
        router.refresh();
        return;
      }

      setError("Could not create support request");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="support-subject"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Subject
        </label>
        <Input
          id="support-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
          maxLength={SUPPORT_SUBJECT_MAX_LENGTH}
          placeholder="Brief summary"
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="support-body"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Message
        </label>
        <textarea
          id="support-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          maxLength={SUPPORT_BODY_MAX_LENGTH}
          rows={6}
          disabled={isLoading}
          placeholder="Describe what you need help with."
          className="w-full rounded-[var(--radius-md)] border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Do not include passwords or payment card details. You can paste short
          excerpts if needed.
        </p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? "Sending..." : "Send request"}
      </Button>
    </form>
  );
}
