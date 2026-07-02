"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { themePreferenceLabels } from "@/config/theme";

export function ThemeSettings() {
  const { preference, resolvedTheme } = useTheme();

  const description =
    preference === "system"
      ? `Follows system settings (currently: ${resolvedTheme === "dark" ? "dark" : "light"})`
      : `Always ${preference === "dark" ? "dark" : "light"} theme`;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <ThemeToggle showLabel className="w-full" />
        <p className="text-xs text-muted-foreground">
          Active mode: {themePreferenceLabels[preference]}
        </p>
      </CardContent>
    </Card>
  );
}