import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminPage } from "@/lib/admin/session";
import { getAdminUserDetail } from "@/lib/admin/users-read";

export const dynamic = "force-dynamic";

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground sm:text-right [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  await requireAdminPage();

  const { id } = await params;
  const user = await getAdminUserDetail(id);

  if (!user) {
    notFound();
  }

  return (
    <>
      <div className="mb-2">
        <Link
          href="/admin/users"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Users
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-all text-2xl font-bold tracking-tight text-foreground">
            {user.email}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only dossier. No actions available on this page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={user.plan === "pro" ? "pro" : "free"}>
            {user.plan === "pro" ? "Pro" : "Free"}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {user.role}
          </Badge>
          <Badge variant="outline">Read-only</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <CardTitle className="text-base">Profile</CardTitle>
            <dl className="mt-3">
              <DetailRow label="User id">
                <span className="font-mono text-xs">{user.id}</span>
              </DetailRow>
              <DetailRow label="Name">{user.name ?? "—"}</DetailRow>
              <DetailRow label="Email">{user.email}</DetailRow>
              <DetailRow label="Plan">
                {user.plan === "pro" ? "Pro" : "Free"}
              </DetailRow>
              <DetailRow label="Role">
                <span className="capitalize">{user.role}</span>
              </DetailRow>
              <DetailRow label="Email verified">
                {user.emailVerified
                  ? `Yes (${formatDateTime(user.emailVerifiedAt)})`
                  : "No"}
              </DetailRow>
              <DetailRow label="Created">
                {formatDateTime(user.createdAt)}
              </DetailRow>
              <DetailRow label="Updated">
                {formatDateTime(user.updatedAt)}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <CardTitle className="text-base">Sign-in</CardTitle>
            <dl className="mt-3">
              <DetailRow label="Methods">{user.signInMethods}</DetailRow>
              <DetailRow label="Password set">
                {user.hasPassword ? "Yes" : "No"}
              </DetailRow>
              <DetailRow label="OAuth providers">
                {user.oauthProviders.length > 0
                  ? user.oauthProviders.join(", ")
                  : "None"}
              </DetailRow>
            </dl>
            <CardDescription className="mt-3 text-xs">
              Password hashes and tokens are never shown.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <CardTitle className="text-base">Usage (counts only)</CardTitle>
            <dl className="mt-3">
              <DetailRow label="Current period">{user.usage.period}</DetailRow>
              <DetailRow label="Used / limit">
                {user.usage.used} / {user.usage.limit}
              </DetailRow>
              <DetailRow label="Remaining">{user.usage.remaining}</DetailRow>
              <DetailRow label="Resets at">
                {formatDateTime(user.usage.resetAt)}
              </DetailRow>
              <DetailRow label="Saved drafts">
                {user.savedDraftsCount}
              </DetailRow>
              <DetailRow label="Generations (all time)">
                {user.generationsTotalCount}
              </DetailRow>
              <DetailRow label="Generations (last 7 days)">
                {user.generationsLast7Days}
              </DetailRow>
            </dl>
            <CardDescription className="mt-3 text-xs">
              Draft bodies and generation prompt/result text are not displayed.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <CardTitle className="text-base">Subscription metadata</CardTitle>
            {user.subscription ? (
              <dl className="mt-3">
                <DetailRow label="Provider">
                  {user.subscription.provider}
                </DetailRow>
                <DetailRow label="Status">{user.subscription.status}</DetailRow>
                <DetailRow label="Cancel at period end">
                  {user.subscription.cancelAtPeriodEnd ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="Period end">
                  {formatDateTime(user.subscription.currentPeriodEnd)}
                </DetailRow>
                <DetailRow label="Paddle customer id">
                  {user.subscription.paddleCustomerId ?? "—"}
                </DetailRow>
                <DetailRow label="Paddle subscription id">
                  {user.subscription.paddleSubscriptionId ?? "—"}
                </DetailRow>
                <DetailRow label="Stripe customer id">
                  {user.subscription.stripeCustomerId ?? "—"}
                </DetailRow>
                <DetailRow label="Stripe subscription id">
                  {user.subscription.stripeSubscriptionId ?? "—"}
                </DetailRow>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No subscription row for this user.
              </p>
            )}
            <CardDescription className="mt-3 text-xs">
              IDs only. No card numbers or webhook secrets. Plan cannot be
              changed from this page.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 border-dashed">
        <CardContent className="p-5">
          <CardTitle className="text-base">Support</CardTitle>
          <CardDescription className="mt-2">
            Support inbox is not implemented yet. Users contact{" "}
            <span className="text-foreground">support@creatornivo.com</span>{" "}
            via Settings Help &amp; contact.
          </CardDescription>
        </CardContent>
      </Card>
    </>
  );
}
