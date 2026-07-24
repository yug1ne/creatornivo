import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { guideArticles } from "../src/config/guides/articles";
import {
  getAllPublishedGuidePlainText,
  getGuideCanonicalUrl,
  getPublishedGuideBySlug,
  getPublishedGuideSlugs,
  listPublishedGuides,
} from "../src/lib/guides";

const EXPECTED_SLUGS = [
  "what-is-creatornivo",
  "how-template-based-ai-drafting-works",
  "why-structured-inputs-improve-ai-drafts",
  "review-edit-verify-ai-drafts",
  "ai-assisted-drafting-vs-chatbots",
  "free-vs-pro-generations",
  "common-input-mistakes",
  "using-the-draft-library",
] as const;

test("published guides include all eight public articles", () => {
  const published = listPublishedGuides();
  const slugs = published.map((item) => item.slug);

  assert.equal(published.length, 8);
  for (const slug of EXPECTED_SLUGS) {
    assert.ok(slugs.includes(slug), `missing published slug: ${slug}`);
  }
});

test("published slugs resolve and unknown slug is null", () => {
  for (const slug of EXPECTED_SLUGS) {
    const article = getPublishedGuideBySlug(slug);
    assert.ok(article, `expected article for ${slug}`);
    assert.equal(article.slug, slug);
    assert.ok(article.title.length > 0);
    assert.ok(article.description.length > 0);
    assert.ok(article.sections.length > 0);
  }

  assert.equal(getPublishedGuideBySlug("does-not-exist"), null);
  assert.equal(getPublishedGuideBySlug("generate"), null);
});

test("draft guides are excluded from index and slug lookup", () => {
  const draftSlug = "__test_draft_guide__";
  const hasRealDraft = guideArticles.some((article) => article.draft === true);

  assert.equal(hasRealDraft, false);
  assert.ok(!getPublishedGuideSlugs().includes(draftSlug));
  assert.equal(getPublishedGuideBySlug(draftSlug), null);

  for (const article of guideArticles) {
    if (article.draft === true) {
      assert.equal(getPublishedGuideBySlug(article.slug), null);
      assert.ok(!listPublishedGuides().some((item) => item.slug === article.slug));
    }
  }
});

test("guides routes and footer link exist", () => {
  const indexPage = readFileSync("src/app/(public)/guides/page.tsx", "utf8");
  const slugPage = readFileSync(
    "src/app/(public)/guides/[slug]/page.tsx",
    "utf8",
  );
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");

  assert.match(indexPage, /listPublishedGuides/);
  assert.match(indexPage, /canonical/);
  assert.match(slugPage, /getPublishedGuideBySlug/);
  assert.match(slugPage, /notFound/);
  assert.match(slugPage, /generateStaticParams/);
  assert.match(slugPage, /application\/ld\+json/);
  assert.match(footer, /href="\/guides"/);
  assert.match(footer, />\s*Guides\s*</);

  assert.doesNotMatch(indexPage, /\/generate\/guides/);
  assert.doesNotMatch(slugPage, /\/generate\/guides/);
});

test("canonical URLs use www.creatornivo.com guides paths", () => {
  assert.equal(
    getGuideCanonicalUrl(),
    "https://www.creatornivo.com/guides",
  );
  assert.equal(
    getGuideCanonicalUrl("what-is-creatornivo"),
    "https://www.creatornivo.com/guides/what-is-creatornivo",
  );
  assert.equal(
    getGuideCanonicalUrl("free-vs-pro-generations"),
    "https://www.creatornivo.com/guides/free-vs-pro-generations",
  );
});

test("public guide copy avoids forbidden marketing and provider claims", () => {
  const copy = getAllPublishedGuidePlainText();

  for (const unsupported of [
    /unlimited generations/i,
    /unlimited generation/i,
    /buy pro now/i,
    /guaranteed (seo|conversion|conversions|ranking)/i,
    /publish-ready/i,
    /no review (needed|required)/i,
    /testimonial/i,
    /average rating/i,
    /\b5 stars?\b/i,
    /trusted by/i,
    /checkout powered by paddle/i,
    /checkout powered by freemius/i,
    /checkout powered by fastspring/i,
    /merchant of record is paddle/i,
    /\bpaddle\b/i,
    /\bfreemius\b/i,
    /\bfastspring\b/i,
    /#1 ai/i,
    /best ai generator/i,
  ]) {
    assert.doesNotMatch(copy, unsupported);
  }

  assert.match(copy, /AI-assisted text drafting SaaS/i);
  assert.match(copy, /5 completed (AI-assisted )?drafts per UTC day/i);
  assert.match(
    copy,
    /100 completed (AI-assisted )?drafts per UTC calendar month/i,
  );
  assert.match(copy, /review, edit, and verify/i);
  assert.match(copy, /Self-serve paid checkout may be unavailable/i);
  assert.match(copy, /structured inputs/i);
  assert.match(copy, /template-based/i);
});

test("free-vs-pro guide states honest Early Access limits", () => {
  const article = getPublishedGuideBySlug("free-vs-pro-generations");
  assert.ok(article);
  const body = [
    article.description,
    ...article.sections.flatMap((section) => [
      ...(section.heading ? [section.heading] : []),
      ...section.paragraphs,
      ...(section.list ?? []),
    ]),
  ].join("\n");

  assert.match(body, /5 completed AI-assisted drafts per UTC day/i);
  assert.match(
    body,
    /100 completed AI-assisted drafts per UTC calendar month/i,
  );
  assert.match(body, /Self-serve paid checkout may be unavailable/i);
  assert.match(body, /Early Access/i);
  assert.doesNotMatch(body, /billing period quota/i);
  assert.doesNotMatch(body, /Buy Pro now/i);
});

test("guide content does not embed private prompt paths or secrets", () => {
  const articlesSource = readFileSync("src/config/guides/articles.ts", "utf8");
  const plain = getAllPublishedGuidePlainText();
  const combined = `${articlesSource}\n${plain}`;

  assert.doesNotMatch(combined, /prisma\/template-prompts/);
  assert.doesNotMatch(combined, /OPENAI_API_KEY/);
  assert.doesNotMatch(combined, /PADDLE_API_KEY/);
  assert.doesNotMatch(combined, /fillPromptTemplate/);
});

test("each guide states review responsibility and template workflow", () => {
  for (const slug of EXPECTED_SLUGS) {
    const article = getPublishedGuideBySlug(slug);
    assert.ok(article);
    const body = [
      article.description,
      ...article.sections.flatMap((section) => [
        ...(section.heading ? [section.heading] : []),
        ...section.paragraphs,
        ...(section.list ?? []),
      ]),
    ].join("\n");

    assert.match(body, /template/i);
    assert.match(body, /review/i);
  }
});
