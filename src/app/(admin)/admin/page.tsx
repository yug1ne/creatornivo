import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { isAuthRateLimitEnabled } from "@/config/auth-rate-limit";
import {
  isBillingCheckoutConfigured,
  isBillingConfigured,
} from "@/config/billing";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function probeDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default async function AdminPage() {
  await requireAdminPage();

  const [userCount, templateCount, databaseOk] = await Promise.all([
    prisma.user.count(),
    prisma.template.count(),
    probeDatabase(),
  ]);

  const authRateLimitConfigured = isAuthRateLimitEnabled();
  const billingConfigured = isBillingConfigured();
  const checkoutConfigured = isBillingCheckoutConfigured();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Admin dashboard
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Founder/ops overview. Counts only — no user emails, drafts, or
        generation content on this page.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <CardTitle>Users</CardTitle>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {userCount}
              </p>
              <CardDescription className="mt-1">
                Read-only accounts list and detail
              </CardDescription>
              <p className="mt-3 text-xs font-medium text-primary">
                Open users →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/templates">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <CardTitle>Templates</CardTitle>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {templateCount}
              </p>
              <CardDescription className="mt-1">
                Manage catalog, categories, and plan gates
              </CardDescription>
              <p className="mt-3 text-xs font-medium text-primary">
                Open template admin →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/support">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <CardTitle>Support</CardTitle>
              <CardDescription className="mt-2">
                Inbox, reply, close / reopen user threads
              </CardDescription>
              <p className="mt-3 text-xs font-medium text-primary">
                Open support inbox →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-6">
            <CardTitle>System</CardTitle>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Database</dt>
                <dd className="font-medium text-foreground">
                  {databaseOk ? "ok" : "unavailable"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Auth rate limits</dt>
                <dd className="font-medium text-foreground">
                  {authRateLimitConfigured ? "configured" : "not configured"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Billing config</dt>
                <dd className="font-medium text-foreground">
                  {billingConfigured ? "present" : "not configured"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Self-serve checkout</dt>
                <dd className="font-medium text-foreground">
                  {checkoutConfigured ? "configured" : "paused / unavailable"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Non-secret status only. No API keys or provider secrets shown.
            </p>
            <Link
              href="/api/health"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "mt-4",
              })}
            >
              Open health JSON
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-dashed">
        <CardContent className="p-5">
          <CardTitle className="text-base">Billing note</CardTitle>
          <CardDescription className="mt-2 text-sm leading-relaxed">
            {checkoutConfigured
              ? "Checkout configuration is present in this environment. Treat payment changes carefully; this admin surface does not modify billing."
              : "Self-serve paid checkout looks paused or not fully configured in this environment. Public pricing may still show Early Access / contact options. This page does not change payment logic."}
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="mt-4 opacity-80">
        <CardContent className="p-5">
          <CardTitle className="text-base">Coming later</CardTitle>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            <li>
              <Link href="/admin/support" className="text-primary hover:underline">
                Support inbox
              </Link>{" "}
              (available)
            </li>
            <li>Subscription ops actions (still read-only IDs on user detail)</li>
            <li>Destructive admin tools (not available)</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
