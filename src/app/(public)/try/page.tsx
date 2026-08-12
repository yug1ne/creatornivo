import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { TRIAL_INVITE_COOKIE_NAME } from "@/config/trial";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private trial invitation",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function PrivateTrialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, params, cookieStore] = await Promise.all([
    getSession(),
    searchParams,
    cookies(),
  ]);
  const hasPrivateInvite = Boolean(
    cookieStore.get(TRIAL_INVITE_COOKIE_NAME)?.value,
  );
  const invalid = params.error === "invalid_invite" || !hasPrivateInvite;

  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <p className="text-sm font-medium text-primary">Private invitation</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        CreatorNivo trial
      </h1>

      {invalid ? (
        <div className="mt-6 rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This invitation is invalid, expired, revoked, or already used.
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            This private invitation includes 72 hours of access to all templates
            and up to 30 completed generations. No credit card is required.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            The trial starts after your email is verified. Each invitation and
            account can be used once.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {session ? (
              <Link
                href="/try/activate"
                className={buttonVariants({ className: "w-full" })}
              >
                Activate trial
              </Link>
            ) : (
              <>
                <Link
                  href="/register?callbackUrl=/try/activate"
                  className={buttonVariants({ className: "w-full" })}
                >
                  Create account
                </Link>
                <Link
                  href="/login?callbackUrl=/try/activate"
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full",
                  })}
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
