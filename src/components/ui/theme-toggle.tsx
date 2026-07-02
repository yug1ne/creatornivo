"use client";

import { useEffect, useState } from "react";

import { useTheme } from "@/components/providers/theme-provider";
import {
  THEME_PREFERENCES,
  themePreferenceLabels,
  type ThemePreference,
} from "@/config/theme";
import { cn } from "@/lib/utils/cn";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SystemIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const themeIcons: Record<ThemePreference, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: SystemIcon,
};

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-9 rounded-[var(--radius-md)] bg-muted",
          showLabel ? "w-full" : "w-[108px]",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={cn(
        "inline-flex rounded-[var(--radius-md)] border border-border bg-muted/50 p-1",
        showLabel ? "w-full" : "w-auto",
        className,
      )}
    >
      {THEME_PREFERENCES.map((option) => {
        const Icon = themeIcons[option];
        const isActive = preference === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => setPreference(option)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              isActive
                ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:text-foreground",
              showLabel ? "min-w-0" : "min-w-8",
            )}
            aria-label={themePreferenceLabels[option]}
            aria-pressed={isActive}
            title={themePreferenceLabels[option]}
          >
            <Icon />
            {showLabel && (
              <span className="truncate">{themePreferenceLabels[option]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}