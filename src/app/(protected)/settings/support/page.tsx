import Link from "next/link";

import { CreateSupportForm } from "@/components/settings/support/create-support-form";
import { SupportStatusBadge } from "@/components/settings/support/support-status-badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { listUserSupportThreads } from "@/lib/support/service";
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
  const threads = await listUserSupportThreads(session.id, prismaSupportStore);

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
              {threads.map((thread) => (
                <li key={thread.id}>
                  <Link href={`/settings/support/${thread.id}`}>
                    <Card hover>
                      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {thread.subject}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Updated {formatDate(thread.lastMessageAt)} ·{" "}
                            {thread.messageCount} message
                            {thread.messageCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <SupportStatusBadge status={thread.status} />
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
