import { redirect } from "next/navigation";

import { isAdminUser } from "@/lib/admin/guards";
import { getSession } from "@/lib/auth/session";

export async function requireAdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }

  if (!isAdminUser(session)) {
    redirect("/dashboard");
  }

  return session;
}
