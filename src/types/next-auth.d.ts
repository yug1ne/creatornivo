import type { DefaultSession } from "next-auth";

import type { Plan } from "@/config/plans";
import type { UserRole } from "@/types/user";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: Plan;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    plan: Plan;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    plan: Plan;
    role: UserRole;
  }
}