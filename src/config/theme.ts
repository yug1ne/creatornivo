export const THEME_STORAGE_KEY = "creatornivo-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = [
  "light",
  "dark",
  "system",
];

export const themePreferenceLabels: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export const themePreferenceDescriptions: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System — use device setting",
};

export const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var useSystem=s==="system"||!s;var d=s==="dark"||(useSystem&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})();`;
