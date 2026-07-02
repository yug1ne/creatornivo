import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          {siteConfig.name}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}