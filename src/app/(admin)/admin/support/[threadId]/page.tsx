import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSupportReplyForm } from "@/components/admin/admin-support-reply-form";
import { AdminSupportStatusActions } from "@/components/admin/admin-support-status-actions";
import { SupportStatusBadge } from "@/components/settings/support/support-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminPage } from "@/lib/admin/session";
import { formatSignInMethods } from "@/lib/auth/sign-in-methods";
import {
  getAdminSupportThreadDetail,
  SupportAccessError,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface AdminSupportThreadPageProps {
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
      return "Admin";
    case "SYSTEM":
      return "System";
    default:
      return "User";
  }
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground sm:text-right [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

export default async function AdminSupportThreadPage({
  params,
}: AdminSupportThreadPageProps) {
  await requireAdminPage();
  const { threadId } = await params;

  let thread;
  try {
    thread = await getAdminSupportThreadDetail(
      threadId,
      prismaSupportStore,
      formatSignInMethods,
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
          href="/admin/support"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Support inbox
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-foreground">
            {thread.subject}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Opened {formatDateTime(thread.createdAt)} · Updated{" "}
            {formatDateTime(thread.lastMessageAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SupportStatusBadge status={thread.status} />
          <Badge variant="outline">Admin</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Timeline
              </CardTitle>
              <ol className="space-y-3">
                {thread.messages.map((message) => {
                  const isAdmin = message.senderType === "ADMIN";
                  return (
                    <li
                      key={message.id}
                      className={cn(
                        "rounded-[var(--radius-md)] border border-border px-4 py-3",
                        isAdmin ? "bg-accent/40" : "bg-muted/30",
                        message.isInternal && "border-dashed opacity-90",
                      )}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {senderLabel(message.senderType)}
                          {message.isInternal ? " · internal" : null}
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

          <Card>
            <CardContent className="space-y-3 p-5">
              <CardTitle className="text-base">Reply to user</CardTitle>
              <CardDescription>
                Replies are public to the user and set status to Answered.
                Sender type is always Admin (server-side).
              </CardDescription>
              <AdminSupportReplyForm threadId={thread.id} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <CardTitle className="text-base">Thread status</CardTitle>
              <AdminSupportStatusActions
                threadId={thread.id}
                status={thread.status}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardContent className="p-5">
            <CardTitle className="text-base">User context</CardTitle>
            <dl className="mt-3">
              <DetailRow label="Email">{thread.user.email}</DetailRow>
              <DetailRow label="User id">
                <span className="font-mono text-xs">{thread.user.id}</span>
              </DetailRow>
              <DetailRow label="Name">{thread.user.name ?? "—"}</DetailRow>
              <DetailRow label="Plan">
                {thread.user.plan === "pro" ? "Pro" : "Free"}
              </DetailRow>
              <DetailRow label="Role">
                <span className="capitalize">{thread.user.role}</span>
              </DetailRow>
              <DetailRow label="Sign-in">
                {thread.user.signInMethods}
              </DetailRow>
              <DetailRow label="Joined">
                {formatDateTime(thread.user.createdAt)}
              </DetailRow>
            </dl>
            <Link
              href={`/admin/users/${thread.user.id}`}
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Open user dossier →
            </Link>
            <CardDescription className="mt-3 text-xs">
              No drafts, generation content, passwords, or payment secrets are
              shown here.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
