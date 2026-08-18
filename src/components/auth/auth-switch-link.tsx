"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getAuthPageHref } from "@/lib/auth/callback-url";

type AuthSwitchLinkProps = {
  dest: "login" | "register";
  children: React.ReactNode;
  className?: string;
};

export function AuthSwitchLink({
  dest,
  children,
  className = "font-medium text-primary hover:underline",
}: AuthSwitchLinkProps) {
  const searchParams = useSearchParams();
  const href = getAuthPageHref(dest, searchParams.get("callbackUrl"));

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
