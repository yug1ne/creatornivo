"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import {
  getProtectedGeneratePath,
  getPublicToolAuthHref,
} from "@/lib/seo/public-tools";
import { cn } from "@/lib/utils/cn";

type ToolTryCtaProps = {
  templateSlug: string;
  label: string;
  size?: "md" | "lg";
  className?: string;
};

export function ToolTryCta({
  templateSlug,
  label,
  size = "lg",
  className,
}: ToolTryCtaProps) {
  const { data: session, status } = useSession();
  const generatePath = getProtectedGeneratePath(templateSlug);
  const guestHref = getPublicToolAuthHref(templateSlug, "register");
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);

  return (
    <Link
      href={isAuthenticated ? generatePath : guestHref}
      className={cn(
        buttonVariants({
          size,
          className: "min-w-[220px] shadow-lg shadow-primary/25",
        }),
        className,
      )}
      data-cta="try-template"
      data-template-slug={templateSlug}
      data-auth-state={isAuthenticated ? "authenticated" : "guest"}
    >
      {label}
    </Link>
  );
}

export function ToolSignInLink({
  templateSlug,
  className,
}: {
  templateSlug: string;
  className?: string;
}) {
  const { status, data: session } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);

  if (isAuthenticated) {
    return null;
  }

  return (
    <Link
      href={getPublicToolAuthHref(templateSlug, "login")}
      className={cn(
        "text-sm font-medium text-muted-foreground hover:text-foreground hover:underline",
        className,
      )}
      data-cta="sign-in-template"
      data-template-slug={templateSlug}
    >
      Already have an account? Sign in
    </Link>
  );
}
