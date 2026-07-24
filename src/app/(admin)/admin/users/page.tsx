import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/admin/session";
import { parseAdminUsersSearchParams, shortenUserId } from "@/lib/admin/users-query";
import { listAdminUsers } from "@/lib/admin/users-read";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildPageHref(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  await requireAdminPage();

  const raw = await searchParams;
  const { q, page } = parseAdminUsersSearchParams(raw);
  const result = await listAdminUsers({ q, page });

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
            Users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only list. No edit, delete, or plan actions on this page.
          </p>
        </div>
        <Badge variant="outline">Read-only</Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form method="get" action="/admin/users" className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search email, name, or full user id…"
              aria-label="Search users"
              className="flex-1"
              maxLength={100}
            />
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      <p className="mb-4 text-xs text-muted-foreground">
        {result.total === 0
          ? "No users match."
          : `Showing ${result.users.length} of ${result.total} · page ${result.page} of ${result.totalPages}`}
      </p>

      {result.users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {q
              ? "No users found for that search. Try another email, name, or full id."
              : "No users in the database yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">User</th>
                <th className="px-3 py-2.5 font-medium">Plan</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Verified</th>
                <th className="px-3 py-2.5 font-medium">Sign-in</th>
                <th className="px-3 py-2.5 font-medium">Drafts</th>
                <th className="px-3 py-2.5 font-medium">Gens</th>
                <th className="px-3 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {user.email}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {user.name ? `${user.name} · ` : null}
                      <span title={user.id}>{shortenUserId(user.id)}</span>
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={user.plan === "pro" ? "pro" : "free"}>
                      {user.plan === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 capitalize text-foreground">
                    {user.role}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {user.emailVerified ? "Yes" : "No"}
                  </td>
                  <td className="max-w-[10rem] px-3 py-3 text-xs text-muted-foreground">
                    {user.signInMethods}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {user.savedDraftsCount}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {user.generationsCount}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
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
            href={buildPageHref(q, Math.max(1, result.page - 1))}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              result.page <= 1 && "pointer-events-none opacity-40",
            )}
            aria-disabled={result.page <= 1}
          >
            Previous
          </Link>
          <span className="text-xs text-muted-foreground">
            Page {result.page} / {result.totalPages}
          </span>
          <Link
            href={buildPageHref(q, Math.min(result.totalPages, result.page + 1))}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              result.page >= result.totalPages &&
                "pointer-events-none opacity-40",
            )}
            aria-disabled={result.page >= result.totalPages}
          >
            Next
          </Link>
        </div>
      ) : null}
    </>
  );
}
