import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { privacyPolicySections } from "../src/config/legal/privacy-policy";
import { refundPolicySections } from "../src/config/legal/refund-policy";
import { responsibleUseSections } from "../src/config/legal/responsible-use";
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
  assert.match(terms, /one hundred/i);
  assert.match(terms, /five per day/i);
  assert.match(terms, /mandatory consumer rights/i);
  assert.doesNotMatch(terms, /14-day money-back guarantee/i);
  assert.doesNotMatch(
    terms,
    /Delaware|officers|directors|employees|team or enterprise|third-party authentication/i,
  );
});

test("Terms describe Freemius-powered paid subscriptions and delayed Pro activation", () => {
  const terms = legalText(termsOfServiceSections);

  assert.match(terms, /Freemius/i);
  assert.match(
    terms,
    /authorized payment provider|Merchant of Record/i,
  );
  assert.match(
    terms,
    /checkout|renewals|invoices|taxes|payment methods|subscription management/i,
  );
  assert.match(
    terms,
    /Pro access is activated after payment is confirmed/i,
  );
  assert.match(
    terms,
    /Returning from a checkout success page does not by itself guarantee immediate Pro access/i,
  );
  assert.match(
    terms,
    /customer billing portal|Freemius customer/i,
  );
  assert.match(
    terms,
    /maintaining a valid payment method/i,
  );
  assert.doesNotMatch(
    terms,
    /Self-serve paid checkout is currently unavailable while we finalize our payment provider/i,
  );
  assert.doesNotMatch(terms, /Paddle/i);
});

test("Terms describe self-service account deletion and conditional billing prerequisites", () => {
  const terms = legalText(termsOfServiceSections);

  assert.match(terms, /Settings → Privacy & Data/i);
  assert.match(terms, /typing DELETE/i);
  assert.match(terms, /permanent/i);
  assert.match(terms, /customer portal|with support/i);
});

test("Privacy reflects actual processors and product data categories", () => {
  const privacy = legalText(privacyPolicySections);

  assert.match(privacy, /optional name, email address/i);
  assert.match(privacy, /OpenAI/i);
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
  assert.doesNotMatch(privacy, /Namecheap/i);
  assert.doesNotMatch(
    privacy,
    /avatar|Google OAuth|GitHub OAuth|Standard Contractual Clauses/i,
  );
});

test("Privacy names Freemius as payment processor and no full card storage", () => {
  const privacy = legalText(privacyPolicySections);

  assert.match(privacy, /Freemius/i);
  assert.match(
    privacy,
    /Merchant of Record|authorized payment provider/i,
  );
  assert.match(
    privacy,
    /payment details|billing address|tax|invoice|subscription data/i,
  );
  assert.match(
    privacy,
    /We do not store full payment card numbers|do not store full payment card numbers/i,
  );
  assert.match(
    privacy,
    /Customer Portal|customer portal|billing portal/i,
  );
  assert.doesNotMatch(privacy, /Paddle/i);
});

test("Privacy cookie section discloses essential cookies and no ad tracking", () => {
  const privacy = legalText(privacyPolicySections);

  assert.match(privacy, /Cookies and Local Storage/i);
  assert.match(
    privacy,
    /essential cookies|required for the Service to work securely/i,
  );
  assert.match(privacy, /login and session|authentication and session/i);
  assert.match(privacy, /checkout and billing|paid checkout/i);
  assert.match(privacy, /theme|local storage/i);
  assert.match(
    privacy,
    /does not currently use advertising cookies|No advertising cookies/i,
  );
  assert.match(
    privacy,
    /behavioral tracking cookies|behavioral marketing cookies/i,
  );
  assert.match(
    privacy,
    /third-party marketing pixels/i,
  );
  assert.match(
    privacy,
    /If we later add non-essential analytics or marketing cookies/i,
  );
  assert.match(privacy, /request consent where required/i);
  assert.match(
    privacy,
    /do not present a cookie consent banner for essential-only/i,
  );
  assert.doesNotMatch(privacy, /Accept All Cookies/i);
});

test("app does not ship an Accept All Cookies consent banner", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");
  assert.doesNotMatch(layout, /Accept All Cookies|CookieBanner|cookie-consent/i);
  assert.doesNotMatch(footer, /Accept All Cookies|CookieBanner|cookie-consent/i);
});

test("Refund Policy aligns with 7-day Freemius money-back guarantee", () => {
  const refund = legalText(refundPolicySections);

  assert.match(refund, /7.?day|seven \(7\) days/i);
  assert.match(refund, /money-back guarantee/i);
  assert.match(refund, /product, access, or technical/i);
  assert.match(refund, /Freemius/i);
  assert.match(refund, /Merchant of Record/i);
  assert.match(refund, /case-by-case|reviewed individually/i);
  assert.match(refund, /contact support|Email:/i);
  assert.match(
    refund,
    /After a refund is confirmed, account access may be adjusted/i,
  );
  assert.match(refund, /Pro access may be revoked|access may be revoked/i);
  assert.match(
    refund,
    /change of mind|abuse|fraud|Terms of Service|Responsible Use/i,
  );
  assert.doesNotMatch(
    refund,
    /Self-serve paid checkout is currently unavailable while we finalize our payment provider/i,
  );
  assert.doesNotMatch(refund, /14-day money-back guarantee/i);
  assert.doesNotMatch(
    refund,
    /will be canceled immediately|will be downgraded|within 3.?5 business days/i,
  );
  assert.doesNotMatch(refund, /Paddle/i);
});

test("Refund Policy treats AI drafts as consumptive usage with limited refunds after substantial use", () => {
  const refund = legalText(refundPolicySections);

  assert.match(refund, /consumptive usage/i);
  assert.match(
    refund,
    /AI-assisted draft|completed generation|completed generations/i,
  );
  assert.match(
    refund,
    /refunds may be denied or limited|may decline or limit refunds/i,
  );
  assert.match(
    refund,
    /substantially or fully used|generation capacity has been substantially/i,
  );
  assert.match(
    refund,
    /service has already been delivered|counts as delivered service|not refundable/i,
  );
  assert.match(
    refund,
    /does not reset|do not reset|not reset or restore|not re-credit/i,
  );
  assert.match(refund, /consumed generation capacity/i);
});

test("Terms describe generation capacity as usage-based consumptive delivered service", () => {
  const terms = legalText(termsOfServiceSections);

  assert.match(terms, /usage-based and consumptive|consumptive/i);
  assert.match(
    terms,
    /completed generation.*delivered service|counts as delivered service/i,
  );
  assert.match(terms, /Refund Policy/i);
});

test("Responsible Use describes AI-assisted drafting, human review, and prohibited uses", () => {
  const responsible = legalText(responsibleUseSections);

  assert.match(responsible, /AI-assisted text drafting SaaS/i);
  assert.match(responsible, /predefined business templates/i);
  assert.match(responsible, /review, edit, and verify/i);
  assert.match(responsible, /Adult or sexual content/i);
  assert.match(responsible, /Deepfakes|impersonat/i);
  assert.match(responsible, /Scams, phishing/i);
  assert.match(responsible, /Gambling/i);
  assert.match(responsible, /Cryptocurrency|financial trading advice/i);
  assert.match(responsible, /Legal, medical/i);
  assert.match(responsible, /regulated goods or services/i);
  assert.match(responsible, /Hate, harassment/i);
  assert.match(responsible, /Political persuasion or manipulation/i);
  assert.match(
    responsible,
    /Misuse, abuse, fraud|Refunds may be denied|access may be revoked/i,
  );
  assert.match(responsible, /Freemius|payment provider/i);
  assert.doesNotMatch(responsible, /app\.creatornivo/i);
});

test("legal documents do not keep checkout-unavailable payment-provider-pending wording", () => {
  const allLegal = legalText([
    ...termsOfServiceSections,
    ...privacyPolicySections,
    ...refundPolicySections,
    ...responsibleUseSections,
  ]);

  assert.doesNotMatch(
    allLegal,
    /Self-serve paid checkout is currently unavailable while we finalize our payment provider/i,
  );
  assert.doesNotMatch(
    allLegal,
    /while we finalize our payment provider/i,
  );
  assert.doesNotMatch(allLegal, /Paddle/i);
  assert.match(allLegal, /Freemius/i);
});

test("all legal documents use support@creatornivo.com and production URLs", () => {
  const allLegal = legalText([
    ...termsOfServiceSections,
    ...privacyPolicySections,
    ...refundPolicySections,
    ...responsibleUseSections,
  ]);

  assert.doesNotMatch(allLegal, /localhost|legal@|billing@|privacy@/i);
  assert.match(allLegal, /support@creatornivo\.com/i);
  assert.match(allLegal, /https:\/\/www\.creatornivo\.com\/terms/);
  assert.match(allLegal, /https:\/\/www\.creatornivo\.com\/privacy/);
  assert.match(allLegal, /https:\/\/www\.creatornivo\.com\/refund-policy/);
  assert.match(allLegal, /https:\/\/www\.creatornivo\.com\/responsible-use/);
});

test("public legal routes and footer links remain present", () => {
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");
  assert.match(footer, /href="\/guides"/);
  assert.match(footer, /Guides/);
  assert.match(footer, /href="\/terms"/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/refund-policy"/);
  assert.match(footer, /href="\/responsible-use"/);
  assert.match(footer, /Responsible Use/);

  for (const route of [
    "src/app/(public)/terms/page.tsx",
    "src/app/(public)/privacy/page.tsx",
    "src/app/(public)/refund-policy/page.tsx",
    "src/app/(public)/responsible-use/page.tsx",
  ]) {
    const src = readFileSync(route, "utf8");
    assert.match(src, /LegalDocument/);
  }

  const refundPage = readFileSync(
    "src/app/(public)/refund-policy/page.tsx",
    "utf8",
  );
  assert.doesNotMatch(refundPage, /Paddle/i);
  assert.match(refundPage, /Freemius|Merchant of Record|7-day/i);

  const refundRedirect = readFileSync(
    "src/app/(public)/refund/page.tsx",
    "utf8",
  );
  assert.match(refundRedirect, /permanentRedirect\(["']\/refund-policy["']\)/);
});
