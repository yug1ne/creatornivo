import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { listPublicTools } from "../src/config/public-tools";
import {
  filterPublicTools,
  getPublicToolGroupsInUse,
  getPublicToolHref,
  publicToolMatchesGroup,
  publicToolMatchesQuery,
  toPublicToolCatalogItems,
} from "../src/lib/seo/public-tool-catalog";

const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8");
const catalog = readFileSync("src/components/tools/tools-catalog.tsx", "utf8");
const tools = toPublicToolCatalogItems(listPublicTools());

test("category config maps current public tools and omits empty groups", () => {
  const groups = getPublicToolGroupsInUse(tools);
  const ids = groups.map((group) => group.id);

  assert.ok(ids.includes("social"));
  assert.ok(ids.includes("video"));
  assert.ok(!ids.includes("email"));
  assert.ok(!ids.includes("ecommerce"));
  assert.ok(!ids.includes("launch"));

  for (const tool of tools) {
    if (tool.templateSlug === "youtube-script") {
      assert.equal(publicToolMatchesGroup(tool, "video"), true);
      assert.equal(publicToolMatchesGroup(tool, "social"), false);
    } else {
      assert.equal(publicToolMatchesGroup(tool, "social"), true);
    }
    assert.equal(publicToolMatchesGroup(tool, "all"), true);
  }

  const socialOnly = filterPublicTools(tools, "", "social");
  const videoOnly = filterPublicTools(tools, "", "video");
  assert.equal(socialOnly.length, 7);
  assert.equal(videoOnly.length, 1);
  assert.equal(videoOnly[0]?.slug, "youtube-script-generator");
});

test("search matches title, platform, and description without changing URLs", () => {
  const linkedin = tools.find((tool) => tool.slug === "linkedin-post-generator");
  assert.ok(linkedin);
  assert.equal(publicToolMatchesQuery(linkedin, "linkedin"), true);
  assert.equal(publicToolMatchesQuery(linkedin, "social media"), true);
  assert.equal(publicToolMatchesQuery(linkedin, "blank prompt"), true);
  assert.equal(publicToolMatchesQuery(linkedin, "tiktok"), false);

  for (const tool of tools) {
    assert.equal(getPublicToolHref(tool.slug), `/tools/${tool.slug}`);
  }

  const filtered = filterPublicTools(tools, "YouTube", "all");
  assert.equal(filtered.length, 1);
  assert.equal(
    getPublicToolHref(filtered[0]!.slug),
    "/tools/youtube-script-generator",
  );

  assert.doesNotMatch(catalog, /useSearchParams|usePathname|router\./);
  assert.doesNotMatch(catalog, /href=\{`\/tools\/\$\{search/);
});

test("protected sidebar logo and Back to website both go to /", () => {
  assert.match(sidebar, /<Logo/);
  assert.match(sidebar, /href="\/"/);
  assert.match(sidebar, /ariaLabel=\{`\$\{siteConfig\.name\} home`\}/);
  assert.match(sidebar, />\s*Back to website\s*</);
  assert.doesNotMatch(
    sidebar,
    /href="\/dashboard"[\s\S]{0,80}\{siteConfig\.name\}/,
  );
  assert.doesNotMatch(
    sidebar,
    /text-lg font-bold tracking-tight[\s\S]{0,40}\{siteConfig\.name\}/,
  );
});

test("protected navigation items remain intact", () => {
  for (const item of [
    { href: "/dashboard", label: "Overview" },
    { href: "/templates", label: "Templates" },
    { href: "/generate", label: "Generate" },
    { href: "/library", label: "Library" },
    { href: "/settings", label: "Settings" },
    { href: "/admin", label: "Admin" },
  ]) {
    assert.match(sidebar, new RegExp(`href: "${item.href}"`));
    assert.match(sidebar, new RegExp(`label: "${item.label}"`));
  }

  assert.match(sidebar, /SignOutButton/);
  assert.match(sidebar, /ThemeToggle/);
  assert.match(sidebar, /showAdmin/);
});
