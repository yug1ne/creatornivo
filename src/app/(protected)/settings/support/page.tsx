import Link from "next/link";

import { CreateSupportForm } from "@/components/settings/support/create-support-form";
import { SupportStatusBadge } from "@/components/settings/support/support-status-badge";
import { CountBadge } from "@/components/ui/count-badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import {
  getUserSupportStatusCounts,
  listUserSupportThreads,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SettingsSupportPage() {
  const session = await requireSession();
  const [threads, statusCounts] = await Promise.all([
    listUserSupportThreads(session.id, prismaSupportStore),
    getUserSupportStatusCounts(session.id, prismaSupportStore),
  ]);

  return (
    <>
      <div className="mb-2">
        <Link
          href="/settings#help-contact"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Settings
        </Link>
      </div>

      <PageHeader
        title="Support"
        description="Message the Creatornivo team. Asynchronous replies only — not live chat."
      />

      <div className="max-w-2xl space-y-8">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            Open
            <CountBadge
              count={statusCounts.open}
              tone="default"
              label="waiting for support"
            />
            <span className="text-xs">Waiting for support</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-muted-foreground">
            Answered
            <CountBadge
              count={statusCounts.answered}
              tone="success"
              label="support replied"
            />
            <span className="text-xs">Support replied</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            Closed
            <CountBadge
              count={statusCounts.closed}
              tone="default"
              label="closed requests"
            />
          </span>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <CardTitle className="text-base">New request</CardTitle>
            <p className="text-sm text-muted-foreground">
              Describe what you need help with. We will respond in this thread
              when we can.
            </p>
            <CreateSupportForm />
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Your requests
          </h2>

          {threads.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No support requests yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {threads.map((thread) => {
                const isAnswered = thread.status === "answered";
                return (
                  <li key={thread.id}>
                    <Link href={`/settings/support/${thread.id}`}>
                      <Card
                        hover
                        className={
                          isAnswered
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : undefined
                        }
                      >
                        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {thread.subject}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Updated {formatDate(thread.lastMessageAt)} ·{" "}
                              {thread.messageCount} message
                              {thread.messageCount === 1 ? "" : "s"}
                              {isAnswered ? " · Support replied" : null}
                              {thread.status === "open"
                                ? " · Waiting for support"
                                : null}
                            </p>
                          </div>
                          <SupportStatusBadge status={thread.status} />
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
