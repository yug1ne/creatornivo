import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getNextThemePreference,
} from "../src/components/ui/theme-toggle";
import {
  themePreferenceDescriptions,
} from "../src/config/theme";

const header = readFileSync("src/components/layout/header.tsx", "utf8");

test("mobile header exposes a compact theme control and accessible burger", () => {
  assert.match(header, /<ThemeToggle compact \/>/);
  assert.match(header, /aria-expanded=\{isMenuOpen\}/);
  assert.match(header, /aria-controls="mobile-navigation"/);
  assert.match(header, /Open navigation menu/);
  assert.match(header, /lg:hidden/);
  assert.match(header, /lg:flex/);
});

test("guest and authenticated mobile navigation contain the required actions", () => {
  for (const label of ["Product", "How it works", "Pricing"]) {
    assert.match(header, new RegExp(`label: "${label}"`));
  }
  for (const label of [
    "Sign in",
    "Get started",
    "Dashboard",
    "Account",
    "Sign out",
  ]) {
    assert.match(header, new RegExp(`\\n\\s*${label}\\n`));
  }
  assert.doesNotMatch(header, /session\?\.user\?\.name/);
});

test("mobile menu closes accessibly and prevents background scroll", () => {
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /document\.body\.style\.overflow = "hidden"/);
  assert.match(header, /onClick=\{closeMenu\}/);
  assert.match(header, /max-h-\[calc\(100dvh-4rem\)\]/);
  assert.match(header, /overflow-y-auto/);
  assert.match(header, /focus-visible:ring-2/);
});

test("theme control cycles Light, Dark, System and explains System", () => {
  assert.equal(getNextThemePreference("light"), "dark");
  assert.equal(getNextThemePreference("dark"), "system");
  assert.equal(getNextThemePreference("system"), "light");
  assert.equal(
    themePreferenceDescriptions.system,
    "System — use device setting",
  );
});

test("footer navigation can wrap instead of forcing horizontal overflow", () => {
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");
  assert.match(footer, /flex-wrap/);
  assert.match(footer, /justify-center/);
});

test("protected layout and profile text can shrink on narrow viewports", () => {
  const layout = readFileSync("src/app/(protected)/layout.tsx", "utf8");
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8");
  const settings = readFileSync(
    "src/app/(protected)/settings/page.tsx",
    "utf8",
  );

  assert.match(layout, /min-w-0 flex-1 overflow-x-hidden/);
  assert.match(sidebar, /w-\[min\(18rem,calc\(100vw-1rem\)\)\]/);
  assert.match(settings, /overflow-wrap:anywhere/);
  assert.match(settings, /break-all/);
});
