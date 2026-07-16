import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { privacyPolicySections } from "../src/config/legal/privacy-policy";
import { refundPolicySections } from "../src/config/legal/refund-policy";
import { termsOfServiceSections } from "../src/config/legal/terms-of-service";

interface LegalTextSection {
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: LegalTextSection[];
}

function legalText(sections: LegalTextSection[]): string {
  return sections
    .flatMap((section) => [
      section.title,
      ...(section.paragraphs ?? []),
      ...(section.list ?? []),
      ...(section.subsections ? [legalText(section.subsections)] : []),
    ])
    .join("\n");
}

test("Terms describe real product basics without overclaiming", () => {
  const terms = legalText(termsOfServiceSections);

  assert.match(
    terms,
    /independent software project operated by an individual based in Ukraine/i,
  );
  assert.match(terms, /email address and password/i);
  assert.match(terms, /AI-generated content may be inaccurate/i);
  assert.match(terms, /review, edit, and verify/i);
  assert.match(terms, /circumvent usage limits/i);
  assert.match(terms, /Paddle/i);
  assert.match(terms, /one hundred/i);
  assert.match(terms, /five per day/i);
  assert.match(terms, /mandatory consumer rights/i);
  assert.doesNotMatch(terms, /14-day money-back guarantee/i);
  assert.doesNotMatch(
    terms,
    /Delaware|officers|directors|employees|team or enterprise|third-party authentication/i,
  );
});

test("Terms describe self-service account deletion and subscription prerequisites", () => {
  const terms = legalText(termsOfServiceSections);

  assert.match(terms, /Settings → Privacy & Data/i);
  assert.match(terms, /typing DELETE/i);
  assert.match(terms, /permanent/i);
  assert.match(terms, /Customer Portal/i);
});

test("Privacy reflects actual processors and product data categories", () => {
  const privacy = legalText(privacyPolicySections);

  assert.match(privacy, /optional name, email address/i);
  assert.match(privacy, /OpenAI/i);
  assert.match(privacy, /Paddle/i);
  assert.match(privacy, /Supabase/i);
  assert.match(privacy, /Vercel/i);
  assert.match(privacy, /Resend/i);
  assert.match(privacy, /Sentry/i);
  assert.match(privacy, /Upstash/i);
  assert.match(privacy, /generation reservations and counts|Generation usage/i);
  assert.match(privacy, /does not currently operate a separate.*analytics/i);
  assert.match(privacy, /Settings → Privacy & Data/i);
  assert.match(privacy, /Download my data|Download a machine-readable/i);
  assert.match(privacy, /Delete account|delete your account/i);
  assert.match(privacy, /5,000 records per category/i);
  assert.match(privacy, /Customer Portal/i);
  assert.doesNotMatch(privacy, /Namecheap/i);
  assert.doesNotMatch(
    privacy,
    /avatar|Google OAuth|GitHub OAuth|Standard Contractual Clauses/i,
  );
});

test("Refund Policy is case-by-case and does not invent automatic guarantees", () => {
  const refund = legalText(refundPolicySections);

  assert.match(refund, /case-by-case|reviewed individually/i);
  assert.match(refund, /contact support|Email:/i);
  assert.match(refund, /Paddle/i);
  assert.match(refund, /Merchant of Record/i);
  assert.match(
    refund,
    /After a refund is confirmed, account access may be adjusted/i,
  );
  assert.match(refund, /Approved refunds are processed through Paddle/i);
  assert.doesNotMatch(refund, /14-day money-back guarantee/i);
  assert.match(refund, /do not promise automatic refunds/i);
  assert.doesNotMatch(
    refund,
    /will be canceled immediately|will be downgraded|within 3.?5 business days/i,
  );
});

test("all legal documents use support@creatornivo.com and production URLs", () => {
  const allLegal = legalText([
    ...termsOfServiceSections,
    ...privacyPolicySections,
    ...refundPolicySections,
  ]);

  assert.doesNotMatch(allLegal, /localhost|legal@|billing@|privacy@/i);
  assert.match(allLegal, /support@creatornivo\.com/i);
  assert.match(allLegal, /https:\/\/www\.creatornivo\.com\/terms/);
  assert.match(allLegal, /https:\/\/www\.creatornivo\.com\/privacy/);
  assert.match(allLegal, /https:\/\/www\.creatornivo\.com\/refund-policy/);
});

test("public legal routes and footer links remain present", () => {
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");
  assert.match(footer, /href="\/terms"/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/refund-policy"/);

  for (const route of [
    "src/app/(public)/terms/page.tsx",
    "src/app/(public)/privacy/page.tsx",
    "src/app/(public)/refund-policy/page.tsx",
  ]) {
    const src = readFileSync(route, "utf8");
    assert.match(src, /LegalDocument/);
  }

  const refundRedirect = readFileSync(
    "src/app/(public)/refund/page.tsx",
    "utf8",
  );
  assert.match(refundRedirect, /permanentRedirect\(["']\/refund-policy["']\)/);
});
