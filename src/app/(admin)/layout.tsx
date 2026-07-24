import Link from "next/link";

import { CountBadge } from "@/components/ui/count-badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireAdminPage } from "@/lib/admin/session";
import { adminSupportAttentionCount } from "@/lib/support/counts";
import { getAdminSupportStatusCounts } from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/templates", label: "Templates" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth: layout + each page re-check admin access.
  await requireAdminPage();

  const statusCounts = await getAdminSupportStatusCounts(prismaSupportStore);
  const openSupportCount = adminSupportAttentionCount(statusCounts);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Creatornivo Admin
            </p>
            <nav className="mt-2 flex flex-wrap gap-4">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                  {item.href === "/admin/support" ? (
                    <CountBadge
                      count={openSupportCount}
                      tone="attention"
                      label="open support requests"
                    />
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
