import Link from "next/link";
import { Suspense } from "react";

import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export default function RegisterPage() {
  const googleEnabled = isGoogleAuthConfigured();

  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Sign up
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create an account and start drafting with AI-assisted business templates
      </p>

      <Suspense
        fallback={
          <div className="mt-8 text-sm text-muted-foreground">Loading...</div>
        }
      >
        <RegisterForm googleEnabled={googleEnabled} />
      </Suspense>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
