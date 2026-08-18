import Link from "next/link";
import { Suspense } from "react";

import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export default function LoginPage() {
  const googleEnabled = isGoogleAuthConfigured();

  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to your Creatornivo account
      </p>

      <Suspense
        fallback={
          <div className="mt-8 text-sm text-muted-foreground">Loading...</div>
        }
      >
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Suspense
          fallback={
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          }
        >
          <AuthSwitchLink dest="register">Sign up</AuthSwitchLink>
        </Suspense>
      </p>
    </section>
  );
}
