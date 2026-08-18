import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isProtectedRoute, isPublicRoute } from "../src/config/routes";
import {
  getPublicToolBySlug,
  listPublicToolPagePaths,
  listPublicTools,
  listPublicToolSitemapPaths,
  publicToolsIndex,
} from "../src/config/public-tools";
import { getSafeCallbackUrl } from "../src/lib/auth/callback-url";
import {
  getProtectedGeneratePath,
  getPublicToolAuthHref,
  getPublicToolCanonicalUrl,
  getPublicToolFieldLabel,
  resolvePublicToolDemoFields,
} from "../src/lib/seo/public-tools";
import {
  PUBLIC_ROBOTS_DISALLOW,
  getPublicSitemapPaths,
} from "../src/lib/seo/public-site";
import sitemap from "../src/app/sitemap";

const EXPECTED_TOOL_PAGES = [
  {
    slug: "linkedin-post-generator",
    templateSlug: "linkedin-post",
    h1: "AI LinkedIn Post Generator",
  },
  {
    slug: "x-thread-generator",
    templateSlug: "x-thread",
    h1: "AI X Thread Generator",
  },
  {
    slug: "instagram-post-generator",
    templateSlug: "instagram-post",
    h1: "AI Instagram Post Generator",
  },
  {
    slug: "facebook-post-generator",
    templateSlug: "facebook-post",
    h1: "AI Facebook Post Generator",
  },
  {
    slug: "tiktok-caption-generator",
    templateSlug: "tiktok-caption",
    h1: "AI TikTok Caption Generator",
  },
  {
    slug: "youtube-script-generator",
    templateSlug: "youtube-script",
    h1: "AI YouTube Script Generator",
  },
  {
    slug: "reddit-post-generator",
    templateSlug: "reddit-post",
    h1: "AI Reddit Post Generator",
  },
  {
    slug: "threads-post-generator",
    templateSlug: "threads-post",
    h1: "AI Threads Post Generator",
  },
] as const;

const toolPageSource = readFileSync(
  "src/app/(public)/tools/[slug]/page.tsx",
  "utf8",
);
const toolsIndexSource = readFileSync("src/app/(public)/tools/page.tsx", "utf8");
const toolLandingSource = readFileSync(
  "src/components/tools/tool-landing.tsx",
  "utf8",
);
const toolCtaSource = readFileSync(
  "src/components/tools/tool-try-cta.tsx",
  "utf8",
);
const toolDemoSource = readFileSync(
  "src/components/tools/tool-demo.tsx",
  "utf8",
);
const publicToolsConfig = readFileSync("src/config/public-tools.ts", "utf8");
const homepageSource = readFileSync("src/app/(public)/page.tsx", "utf8");
const pricingSource = readFileSync("src/app/(public)/pricing/page.tsx", "utf8");
const generateSource = readFileSync(
  "src/app/(protected)/generate/page.tsx",
  "utf8",
);
const middlewareSource = readFileSync("src/middleware.ts", "utf8");

test("/tools and all eight tool pages are public routes", () => {
  assert.equal(isProtectedRoute("/tools"), false);
  assert.equal(isProtectedRoute("/tools/linkedin-post-generator"), false);

  for (const path of listPublicToolSitemapPaths()) {
    assert.equal(isProtectedRoute(path), false, `${path} must stay public`);
    assert.equal(isPublicRoute("/generate"), false);
  }

  assert.match(toolsIndexSource, /ToolsIndex/);
  assert.match(toolPageSource, /getPublicToolBySlug/);
  assert.match(toolPageSource, /notFound/);
  assert.match(toolPageSource, /generateStaticParams/);
  assert.doesNotMatch(toolsIndexSource, /requireSession/);
  assert.doesNotMatch(toolPageSource, /requireSession/);
  assert.doesNotMatch(toolLandingSource, /requireSession/);
});

test("public tool catalog has eight unique pages and unique SEO fields", () => {
  const tools = listPublicTools();
  assert.equal(tools.length, 8);
  assert.equal(publicToolsIndex.h1, "AI Content Templates & Generators");

  const slugs = new Set<string>();
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const h1s = new Set<string>();
  const ogTitles = new Set<string>();
  const ogDescriptions = new Set<string>();

  for (const expected of EXPECTED_TOOL_PAGES) {
    const tool = getPublicToolBySlug(expected.slug);
    assert.ok(tool, `missing tool ${expected.slug}`);
    assert.equal(tool.templateSlug, expected.templateSlug);
    assert.equal(tool.h1, expected.h1);
    assert.ok(tool.metaTitle.length > 0);
    assert.ok(tool.metaDescription.length > 40);
    assert.ok(tool.ogTitle.endsWith("| CreatorNivo"));
    assert.ok(tool.faqs.length >= 4);
    assert.ok(tool.useCases.length >= 3);
    assert.ok(tool.demoFields.length >= 3);
    assert.ok(tool.demoFields.length <= 5);
    assert.ok(tool.demoOutput.length > 40);
    assert.ok(tool.relatedSlugs.length >= 2);

    slugs.add(tool.slug);
    titles.add(tool.metaTitle);
    descriptions.add(tool.metaDescription);
    h1s.add(tool.h1);
    ogTitles.add(tool.ogTitle);
    ogDescriptions.add(tool.ogDescription);
  }

  assert.equal(slugs.size, 8);
  assert.equal(titles.size, 8);
  assert.equal(descriptions.size, 8);
  assert.equal(h1s.size, 8);
  assert.equal(ogTitles.size, 8);
  assert.equal(ogDescriptions.size, 8);
  assert.notEqual(publicToolsIndex.metaTitle, tools[0]?.metaTitle);
  assert.notEqual(publicToolsIndex.metaDescription, tools[0]?.metaDescription);
});

test("public tool pages are indexable and use www canonical URLs", () => {
  assert.doesNotMatch(toolsIndexSource, /noindex/);
  assert.doesNotMatch(toolPageSource, /noindex/);
  assert.match(toolsIndexSource, /alternates:\s*\{[\s\S]*canonical/);
  assert.match(toolPageSource, /alternates:\s*\{[\s\S]*canonical/);

  assert.equal(
    getPublicToolCanonicalUrl(),
    "https://www.creatornivo.com/tools",
  );
  assert.equal(
    getPublicToolCanonicalUrl("linkedin-post-generator"),
    "https://www.creatornivo.com/tools/linkedin-post-generator",
  );

  for (const path of PUBLIC_ROBOTS_DISALLOW) {
    assert.notEqual(path, "/tools");
    assert.ok(!path.startsWith("/tools"));
  }
});

test("sitemap includes the nine new public tool routes and still excludes /appsumo", () => {
  const paths = getPublicSitemapPaths();
  const urls = sitemap().map((entry) => entry.url);

  assert.ok(paths.includes("/tools"));
  assert.equal(listPublicToolPagePaths().length, 8);
  assert.equal(listPublicToolSitemapPaths().length, 9);

  for (const path of listPublicToolSitemapPaths()) {
    assert.ok(paths.includes(path), `sitemap paths missing ${path}`);
    assert.ok(
      urls.includes(`https://www.creatornivo.com${path}`),
      `sitemap urls missing ${path}`,
    );
  }

  assert.ok(!paths.includes("/appsumo"));
  assert.ok(!urls.some((url) => url.includes("/appsumo")));
  assert.ok(PUBLIC_ROBOTS_DISALLOW.includes("/appsumo"));
});

test("tool pages never call AI generation or usage reservation APIs", () => {
  const combined = [
    toolsIndexSource,
    toolPageSource,
    toolLandingSource,
    toolCtaSource,
    toolDemoSource,
    publicToolsConfig,
    readFileSync("src/components/tools/tool-faq.tsx", "utf8"),
    readFileSync("src/components/tools/tool-related.tsx", "utf8"),
    readFileSync("src/components/tools/tools-catalog.tsx", "utf8"),
    readFileSync("src/lib/seo/public-tools.ts", "utf8"),
    readFileSync("src/lib/seo/public-tool-catalog.ts", "utf8"),
  ].join("\n");

  for (const forbidden of [
    "/api/ai",
    "/api/ai/generate",
    "GenerationReservation",
    "openai",
    "createReservation",
    "incrementUsage",
    "fillPromptTemplate",
  ]) {
    assert.doesNotMatch(
      combined,
      new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }

  assert.match(toolDemoSource, /Static preview/);
  assert.doesNotMatch(toolDemoSource, /fetch\(/);
  assert.doesNotMatch(toolLandingSource, /fetch\(/);
});

test("guest CTA uses encoded callbackUrl and authenticated target is the template", () => {
  for (const expected of EXPECTED_TOOL_PAGES) {
    const generatePath = getProtectedGeneratePath(expected.templateSlug);
    assert.equal(generatePath, `/generate?template=${expected.templateSlug}`);

    const registerHref = getPublicToolAuthHref(
      expected.templateSlug,
      "register",
    );
    const loginHref = getPublicToolAuthHref(expected.templateSlug, "login");

    assert.equal(
      registerHref,
      `/register?callbackUrl=${encodeURIComponent(generatePath)}`,
    );
    assert.equal(
      loginHref,
      `/login?callbackUrl=${encodeURIComponent(generatePath)}`,
    );

    const encoded = new URL(registerHref, "https://www.creatornivo.com")
      .searchParams.get("callbackUrl");
    assert.equal(getSafeCallbackUrl(encoded), generatePath);
  }

  assert.match(toolCtaSource, /getPublicToolAuthHref\(templateSlug, "register"\)/);
  assert.match(toolCtaSource, /getProtectedGeneratePath\(templateSlug\)/);
  assert.match(toolCtaSource, /useSession/);
  assert.match(toolCtaSource, /data-template-slug=\{templateSlug\}/);
});

test("demo field keys resolve to real template form labels", () => {
  for (const tool of listPublicTools()) {
    const fields = resolvePublicToolDemoFields(tool);
    assert.equal(fields.length, tool.demoFields.length);
    for (const field of fields) {
      assert.equal(
        field.label,
        getPublicToolFieldLabel(tool.templateSlug, field.key),
      );
      assert.ok(field.label.length > 0);
      assert.ok(field.value.length > 0);
    }
  }
});

test("YouTube Script stays Pro and other public tools stay Free", () => {
  const youtube = getPublicToolBySlug("youtube-script-generator");
  assert.ok(youtube);
  assert.equal(youtube.requiredPlan, "pro");

  for (const tool of listPublicTools()) {
    if (tool.slug === "youtube-script-generator") continue;
    assert.equal(tool.requiredPlan, "free", `${tool.slug} should be free`);
  }
});

test("existing homepage, pricing, and protected Generate stay unchanged in contract", () => {
  assert.match(homepageSource, /HeroSection/);
  assert.match(homepageSource, /siteMetadata\.title/);
  assert.doesNotMatch(homepageSource, /\/tools\//);
  assert.match(pricingSource, /Pricing/);
  assert.doesNotMatch(pricingSource, /\/tools\//);
  assert.match(generateSource, /requireSession/);
  assert.equal(isProtectedRoute("/generate"), true);
  assert.equal(isProtectedRoute("/generate/guides/linkedin-post"), true);
  assert.match(middlewareSource, /getSafeCallbackFromLocation/);
});

test("public tool copy avoids publishing claims and generic SEO filler", () => {
  const copy = `${publicToolsConfig}\n${toolLandingSource}`;

  for (const unsupported of [
    /revolutionize/i,
    /unlock the power/i,
    /supercharge/i,
    /game-changing/i,
    /we automatically publish/i,
    /posts? to linkedin for you/i,
    /posts? to instagram for you/i,
    /schedule(d)? publishing/i,
    /unlimited generations/i,
    /publish-ready/i,
    /trusted by/i,
    /aggregateRating/,
  ]) {
    assert.doesNotMatch(copy, unsupported);
  }

  assert.match(copy, /does not post/i);
  assert.match(copy, /does not connect to LinkedIn/i);
});

test("footer links to the public tools index", () => {
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");
  assert.match(footer, /href="\/tools"/);
  assert.match(footer, />\s*Tools\s*</);
});

test("/tools catalog HTML includes a crawlable link for every public tool", () => {
  const catalog = readFileSync(
    "src/components/tools/tools-catalog.tsx",
    "utf8",
  );
  const index = readFileSync("src/components/tools/tools-index.tsx", "utf8");

  assert.match(index, /toPublicToolCatalogItems\(listPublicTools\(\)\)/);
  assert.match(index, /<ToolsCatalog tools=\{tools\}/);
  assert.match(catalog, /tools\.map\(\(tool\) =>/);
  assert.match(catalog, /getPublicToolHref\(tool\.slug\)/);
  assert.match(catalog, /hidden && "hidden"/);
  assert.doesNotMatch(catalog, /useRouter|router\.(push|replace)/);

  for (const expected of EXPECTED_TOOL_PAGES) {
    assert.ok(
      listPublicToolPagePaths().includes(`/tools/${expected.slug}`),
    );
  }
});
