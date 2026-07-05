import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Forgot password
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send reset instructions if an account
        exists.
      </p>

      <ForgotPasswordForm />
    </section>
  );
}