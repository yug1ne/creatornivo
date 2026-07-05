import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Reset password
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a new password for your account.
      </p>

      <Suspense
        fallback={
          <div className="mt-8 text-sm text-muted-foreground">Loading...</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </section>
  );
}