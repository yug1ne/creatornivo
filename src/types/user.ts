import type { Plan } from "@/config/plans";

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  role: UserRole;
}