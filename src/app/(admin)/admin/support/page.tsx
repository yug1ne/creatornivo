import Link from "next/link";

import { SupportStatusBadge } from "@/components/settings/support/support-status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CountBadge } from "@/components/ui/count-badge";
import { requireAdminPage } from "@/lib/admin/session";
import {
  parseAdminSupportListParams,
  type AdminSupportStatusFilter,
} from "@/lib/support/admin-query";
import {
  getAdminSupportStatusCounts,
  listAdminSupportThreads,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface AdminSupportPageProps {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildHref(input: {
  status: AdminSupportStatusFilter;
  q: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (input.status !== "all") params.set("status", input.status);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/admin/support?${qs}` : "/admin/support";
}

const STATUS_TABS: AdminSupportStatusFilter[] = [
  "all",
  "open",
  "answered",
  "closed",
];

export default async function AdminSupportPage({
  searchParams,
}: AdminSupportPageProps) {
  await requireAdminPage();

  const raw = await searchParams;
  const params = parseAdminSupportListParams(raw);
  const [result, statusCounts] = await Promise.all([
    listAdminSupportThreads(params, prismaSupportStore),
    getAdminSupportStatusCounts(prismaSupportStore),
  ]);

  const tabCounts: Record<AdminSupportStatusFilter, number> = {
    all: statusCounts.all,
    open: statusCounts.open,
    answered: statusCounts.answered,
    closed: statusCounts.closed,
  };

  return (
    <>
      <div className="mb-2">
        <Link
          href="/admin"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Admin overview
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Support inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and reply to user support threads. No email notifications yet.
          </p>
        </div>
        <Badge variant="outline">Admin only</Badge>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab];
          const isActive = params.status === tab;
          return (
            <Link
              key={tab}
              href={buildHref({ status: tab, q: params.q })}
              className={cn(
                buttonVariants({
                  variant: isActive ? "default" : "outline",
                  size: "sm",
                }),
                "inline-flex items-center gap-1.5 capitalize",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab}
              <CountBadge
                count={count}
                tone={tab === "open" ? "attention" : "default"}
                label={`${tab} threads`}
                className={
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : undefined
                }
              />
            </Link>
          );
        })}
      </div>

      {statusCounts.open > 0 ? (
        <p className="mb-4 text-sm text-amber-800 dark:text-amber-200">
          {statusCounts.open} open request
          {statusCounts.open === 1 ? "" : "s"} need attention.
        </p>
      ) : null}

      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            method="get"
            action="/admin/support"
            className="flex flex-col gap-3 sm:flex-row"
          >
            {params.status !== "all" ? (
              <input type="hidden" name="status" value={params.status} />
            ) : null}
            <Input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Search subject or user email…"
              aria-label="Search support threads"
              className="flex-1"
              maxLength={100}
            />
            <button
              type="submit"
              className={buttonVariants({ variant: "outline" })}
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      <p className="mb-4 text-xs text-muted-foreground">
        {result.total === 0
          ? "No threads match."
          : `Showing ${result.threads.length} of ${result.total} · page ${result.page} of ${result.totalPages}`}
      </p>

      {result.threads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {params.q || params.status !== "all"
              ? "No support threads match this filter."
              : "No support requests yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Subject</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">User</th>
                <th className="px-3 py-2.5 font-medium">Plan</th>
                <th className="px-3 py-2.5 font-medium">Msgs</th>
                <th className="px-3 py-2.5 font-medium">Created</th>
                <th className="px-3 py-2.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {result.threads.map((thread) => (
                <tr
                  key={thread.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/support/${thread.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {thread.subject}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <SupportStatusBadge status={thread.status} />
                  </td>
                  <td className="px-3 py-3">
                    <p className="break-all text-foreground">
                      {thread.user.email}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={thread.user.plan === "pro" ? "pro" : "free"}
                    >
                      {thread.user.plan === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {thread.messageCount}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatDate(thread.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatDateTime(thread.lastMessageAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={buildHref({
              status: params.status,
              q: params.q,
              page: Math.max(1, result.page - 1),
            })}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              result.page <= 1 && "pointer-events-none opacity-40",
            )}
          >
            Previous
          </Link>
          <span className="text-xs text-muted-foreground">
            Page {result.page} / {result.totalPages}
          </span>
          <Link
            href={buildHref({
              status: params.status,
              q: params.q,
              page: Math.min(result.totalPages, result.page + 1),
            })}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              result.page >= result.totalPages &&
                "pointer-events-none opacity-40",
            )}
          >
            Next
          </Link>
        </div>
      ) : null}
    </>
  );
}
