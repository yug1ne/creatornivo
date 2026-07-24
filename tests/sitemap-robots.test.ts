import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import {
  PUBLIC_ROBOTS_DISALLOW,
  PUBLIC_SITE_ORIGIN,
  PUBLIC_SITEMAP_STATIC_PATHS,
  getPublicSitemapPaths,
} from "../src/lib/seo/public-site";
import { getPublishedGuideSlugs } from "../src/lib/guides";

test("public sitemap paths include marketing, legal, guides index, and published articles only", () => {
  const paths = getPublicSitemapPaths();
  const guideSlugs = getPublishedGuideSlugs();

  for (const path of PUBLIC_SITEMAP_STATIC_PATHS) {
    assert.ok(paths.includes(path), `missing static path ${path}`);
  }

  for (const slug of guideSlugs) {
    assert.ok(
      paths.includes(`/guides/${slug}`),
      `missing guide path for ${slug}`,
    );
  }

  assert.equal(guideSlugs.length, 8);
  assert.equal(paths.length, PUBLIC_SITEMAP_STATIC_PATHS.length + 8);
});

test("sitemap excludes protected, admin, and api routes", () => {
  const paths = getPublicSitemapPaths();
  const urls = sitemap().map((entry) => entry.url);

  for (const forbidden of [
    "/dashboard",
    "/generate",
    "/library",
    "/settings",
    "/settings/support",
    "/admin",
    "/api",
    "/api/health",
    "/login",
    "/register",
  ]) {
    assert.ok(
      !paths.some(
        (path) => path === forbidden || path.startsWith(`${forbidden}/`),
      ),
      `sitemap paths should not include ${forbidden}`,
    );
    assert.ok(
      !urls.some((url) => url.includes(forbidden)),
      `sitemap urls should not include ${forbidden}`,
    );
  }
});

test("sitemap entries use www.creatornivo.com absolute URLs", () => {
  const entries = sitemap();
  assert.ok(entries.length >= 8 + PUBLIC_SITEMAP_STATIC_PATHS.length);

  for (const entry of entries) {
    assert.ok(
      entry.url.startsWith(`${PUBLIC_SITE_ORIGIN}/`) ||
        entry.url === PUBLIC_SITE_ORIGIN ||
        entry.url === `${PUBLIC_SITE_ORIGIN}/`,
    );
    assert.match(entry.url, /^https:\/\/www\.creatornivo\.com(\/|$)/);
  }

  const urls = new Set(entries.map((entry) => entry.url));
  assert.ok(urls.has(`${PUBLIC_SITE_ORIGIN}/`));
  assert.ok(urls.has(`${PUBLIC_SITE_ORIGIN}/guides`));
  assert.ok(urls.has(`${PUBLIC_SITE_ORIGIN}/pricing`));
  assert.ok(
    urls.has(`${PUBLIC_SITE_ORIGIN}/guides/what-is-creatornivo`),
  );
});

test("robots disallows app/api surfaces and points sitemap at www", () => {
  const config = robots();
  const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
  assert.ok(rules);

  const disallow = Array.isArray(rules.disallow)
    ? rules.disallow
    : rules.disallow
      ? [rules.disallow]
      : [];

  for (const path of PUBLIC_ROBOTS_DISALLOW) {
    assert.ok(
      disallow.includes(path),
      `robots should disallow ${path}`,
    );
  }

  assert.equal(config.sitemap, `${PUBLIC_SITE_ORIGIN}/sitemap.xml`);

  const allow = Array.isArray(rules.allow)
    ? rules.allow
    : rules.allow
      ? [rules.allow]
      : [];
  assert.ok(allow.includes("/") || allow.length === 0 || allow.includes("/*"));

  // Public content paths must not appear in disallow list.
  for (const publicPath of [
    "/guides",
    "/pricing",
    "/terms",
    "/privacy",
    "/refund-policy",
    "/responsible-use",
  ]) {
    assert.ok(!disallow.includes(publicPath));
    assert.ok(!disallow.some((item) => item === `${publicPath}/`));
  }
});

test("sitemap and robots route modules exist", () => {
  const sitemapSource = readFileSync("src/app/sitemap.ts", "utf8");
  const robotsSource = readFileSync("src/app/robots.ts", "utf8");

  assert.match(sitemapSource, /MetadataRoute\.Sitemap/);
  assert.match(sitemapSource, /getPublicSitemapPaths/);
  assert.match(robotsSource, /MetadataRoute\.Robots/);
  assert.match(robotsSource, /PUBLIC_ROBOTS_DISALLOW/);
  assert.match(robotsSource, /sitemap\.xml/);
});
