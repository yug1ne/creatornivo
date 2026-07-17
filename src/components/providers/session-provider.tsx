"use client";

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Avoid refetching /api/auth/session on every tab focus (JWT refresh hits DB).
  // Explicit session.update() after checkout still works.
  return (
    <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
  );
}