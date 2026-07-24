"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";

const sidebarItems = [
  { href: "/dashboard", label: "Overview", icon: "◉" },
  { href: "/templates", label: "Templates", icon: "▦" },
  { href: "/generate", label: "Generate", icon: "✦" },
  { href: "/library", label: "Library", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function NavContent({
  onNavigate,
  showAdmin,
}: {
  onNavigate?: () => void;
  showAdmin: boolean;
}) {
  const pathname = usePathname();
  const items = showAdmin
    ? [
        ...sidebarItems,
        { href: "/admin", label: "Admin", icon: "⬡" } as const,
      ]
    : sidebarItems;

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-accent text-accent-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-xs",
                isActive ? "bg-primary/10 text-primary" : "bg-muted",
              )}
              aria-hidden
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { data: session } = useSession();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = mobileOpen ?? internalOpen;
  const close = onMobileClose ?? (() => setInternalOpen(false));
  const userLabel = session?.user?.name ?? session?.user?.email;
  // Cosmetic only — middleware + requireAdminPage enforce access.
  const showAdmin = Boolean(session?.user?.isAdmin);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setInternalOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-md)] transition-transform hover:scale-105 lg:hidden"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-1rem))] max-w-full flex-col overflow-y-auto border-r border-border bg-card p-5 transition-transform lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={close}
            className="text-lg font-bold tracking-tight text-foreground"
          >
            {siteConfig.name}
          </Link>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <NavContent onNavigate={close} showAdmin={showAdmin} />

        <div className="mt-6 border-t border-border pt-4">
          {userLabel ? (
            <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
              {userLabel}
            </p>
          ) : null}
          <SignOutButton onNavigate={close} />
        </div>

        <div className="mt-4">
          <ThemeToggle showLabel className="w-full" />
        </div>

        <div className="mt-4 rounded-[var(--radius-md)] bg-muted/60 p-4">
          <p className="text-xs font-medium text-foreground">Need more?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pro — 100 generations per month and export
          </p>
          <Link
            href="/pricing"
            onClick={close}
            className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
          >
            View pricing →
          </Link>
        </div>

        <p className="mt-4 space-x-3 px-1 text-xs text-muted-foreground">
          <Link
            href="/settings#help-contact"
            onClick={close}
            className="font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            Help &amp; contact
          </Link>
          <Link
            href="/settings/support"
            onClick={close}
            className="font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            Support
          </Link>
        </p>
      </aside>
    </>
  );
}
