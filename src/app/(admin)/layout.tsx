import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/templates", label: "Templates" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Creatornivo Admin
            </p>
            <nav className="mt-2 flex gap-4">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
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