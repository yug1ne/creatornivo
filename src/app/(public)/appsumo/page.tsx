import type { Metadata } from "next";
import Link from "next/link";

import { AppSumoRedeemForm } from "@/components/appsumo/appsumo-redeem-form";
import { buttonVariants } from "@/components/ui/button";
import { isEmailVerified } from "@/lib/auth/email-verification";
import { getSession } from "@/lib/auth/session";
import { countActiveAppSumoRedemptions } from "@/lib/appsumo/entitlement";
import { prisma } from "@/lib/db";
import { resolveUserAccess } from "@/lib/trial/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redeem AppSumo code",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function AppSumoPage() {
  const session = await getSession();

  if (!session) {
    return (
      <section className="mx-auto flex max-w-md flex-col px-6 py-16">
        <p className="text-sm font-medium text-primary">AppSumo</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Redeem your lifetime code
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in or create an account, then enter your AppSumo code. This page
          is not listed in public navigation.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register?callbackUrl=/appsumo"
            className={buttonVariants({ className: "w-full" })}
          >
            Create account
          </Link>
          <Link
            href="/login?callbackUrl=/appsumo"
            className={buttonVariants({
              variant: "outline",
              className: "w-full",
            })}
          >
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      plan: true,
      emailVerified: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });

  if (!user) {
    return (
      <section className="mx-auto flex max-w-md flex-col px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Redeem your lifetime code
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in again to continue.
        </p>
      </section>
    );
  }

  const verified = isEmailVerified(user.emailVerified);
  const activeCodeCount = await countActiveAppSumoRedemptions(session.id);
  const access = resolveUserAccess(user, { activeAppSumoCodeCount: activeCodeCount });
  const isActiveTier1 = access.mode === "appsumo_t1";
  const isMaxAppSumoTier = access.appSumo.tier >= 2;

  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <p className="text-sm font-medium text-primary">AppSumo</p>
      {isMaxAppSumoTier ? (
        <>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            AppSumo Tier 2 is active.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You already have the maximum AppSumo tier with 100 AI-assisted
            drafts per calendar month.
          </p>
        </>
      ) : isActiveTier1 ? (
        <>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Upgrade to AppSumo Tier 2
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Redeem a second AppSumo code on this account to increase your
            allowance from 50 to 100 AI-assisted drafts per UTC calendar month.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Current tier: Tier 1</li>
            <li>After redemption: Tier 2</li>
            <li>Current monthly usage is preserved</li>
            <li>Unused drafts do not roll over</li>
          </ul>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Redeem your lifetime code
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            One code unlocks AppSumo Tier 1 (50 generations per UTC month). A
            second code on the same account unlocks Tier 2 (100 per UTC month).
            Unused generations do not roll over.
          </p>
        </>
      )}

      {access.appSumo.dormant ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Freemius Pro is currently active. Redeemed AppSumo codes stay on this
          account as lifetime fallback if Pro ends.
        </p>
      ) : null}

      {isMaxAppSumoTier ? null : !verified ? (
        <div className="mt-6 rounded-[var(--radius-md)] bg-warning/10 px-4 py-3 text-sm text-warning">
          Verify your email before redeeming this code.
        </div>
      ) : (
        <div className="mt-8">
          <AppSumoRedeemForm
            initialTier={access.appSumo.tier}
            submitLabel={
              isActiveTier1 ? "Redeem second code" : "Redeem code"
            }
          />
        </div>
      )}
    </section>
  );
}
