import type { NextAuthConfig } from "next-auth";

import type { Plan } from "@/config/plans";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import type { UserRole } from "@/types/user";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.plan = user.plan;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.plan = token.plan as Plan;
        session.user.role = token.role as UserRole;
        // UI-only convenience; server guards re-check role + ADMIN_EMAILS.
        session.user.isAdmin = isAdminSession({
          role: token.role as string | undefined,
          email: session.user.email ?? (token.email as string | undefined),
        });
      }

      return session;
    },
  },
} satisfies NextAuthConfig;