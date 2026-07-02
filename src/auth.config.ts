import type { NextAuthConfig } from "next-auth";

import type { Plan } from "@/config/plans";
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
      }

      return session;
    },
  },
} satisfies NextAuthConfig;