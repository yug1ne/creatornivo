import Link from "next/link";
import { notFound } from "next/navigation";

import { SupportReplyForm } from "@/components/settings/support/support-reply-form";
import { SupportStatusBadge } from "@/components/settings/support/support-status-badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import {
  getUserSupportThreadDetail,
  SupportAccessError,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface SupportThreadPageProps {
  params: Promise<{ threadId: string }>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function senderLabel(senderType: string): string {
  switch (senderType) {
    case "ADMIN":
      return "Support";
    case "SYSTEM":
      return "System";
    default:
      return "You";
  }
}

export default async function SupportThreadPage({
  params,
}: SupportThreadPageProps) {
  const session = await requireSession();
  const { threadId } = await params;

  let thread;
  try {
    thread = await getUserSupportThreadDetail(
      { userId: session.id, threadId },
      prismaSupportStore,
    );
  } catch (error) {
    if (error instanceof SupportAccessError && error.code === "not_found") {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <div className="mb-2">
        <Link
          href="/settings/support"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Support requests
        </Link>
      </div>

      <PageHeader
        title={thread.subject}
        description={`Opened ${formatDateTime(thread.createdAt)}`}
        action={<SupportStatusBadge status={thread.status} />}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4 p-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversation
            </CardTitle>

            <ol className="space-y-4">
              {thread.messages.map((message) => {
                const isYou = message.senderType === "USER";
                return (
                  <li
                    key={message.id}
                    className={cn(
                      "rounded-[var(--radius-md)] border border-border px-4 py-3",
                      isYou ? "bg-muted/40" : "bg-card",
                    )}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {senderLabel(message.senderType)}
                      </span>
                      <time dateTime={message.createdAt}>
                        {formatDateTime(message.createdAt)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {message.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {thread.canReply ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <CardTitle className="text-base">Reply</CardTitle>
              <SupportReplyForm threadId={thread.id} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-5 text-sm text-muted-foreground">
              This request is closed. You can read the conversation above, or{" "}
              <Link
                href="/settings/support"
                className="font-medium text-primary hover:underline"
              >
                start a new support request
              </Link>{" "}
              if you still need help.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
