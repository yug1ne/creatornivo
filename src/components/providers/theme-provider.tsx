"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/config/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredPreference(): ThemePreference | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return null;
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return getSystemTheme();
}

function applyTheme(theme: ResolvedTheme, animate = false) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 400);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredPreference();
    const initialPreference = stored ?? "system";
    const initialResolved = resolveTheme(initialPreference);

    setPreferenceState(initialPreference);
    setResolvedTheme(initialResolved);
    applyTheme(initialResolved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange(event: MediaQueryListEvent) {
      const next = event.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyTheme(next);
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mounted, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    const resolved = resolveTheme(next);
    setPreferenceState(next);
    setResolvedTheme(resolved);
    applyTheme(resolved, true);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}