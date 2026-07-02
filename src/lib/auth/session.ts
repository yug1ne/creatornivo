import { auth } from "@/auth";
import type { SessionUser } from "@/types";

export async function getSession(): Promise<SessionUser | null> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    plan: session.user.plan,
    role: session.user.role,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}