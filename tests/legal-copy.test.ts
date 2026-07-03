import assert from "node:assert/strict";
import test from "node:test";

import {
  privacyPolicySections,
} from "../src/config/legal/privacy-policy";
import {
  refundPolicySections,
} from "../src/config/legal/refund-policy";
import {
  termsOfServiceSections,
} from "../src/config/legal/terms-of-service";

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

test("Terms describe the real individual operator and credentials auth", () => {
  const terms = legalText(termsOfServiceSections);

  assert.match(
    terms,
    /independent software project operated by an individual based in Ukraine/i,
  );
  assert.match(terms, /email address and password/i);
  assert.doesNotMatch(
    terms,
    /Delaware|officers|directors|employees|team or enterprise|third-party authentication/i,
  );
  assert.match(terms, /mandatory consumer rights/i);
});

test("Privacy reflects stored product data without unsupported providers or features", () => {
  const privacy = legalText(privacyPolicySections);

  assert.match(privacy, /optional name, email address/i);
  assert.match(privacy, /generation reservations and counts/i);
  assert.match(privacy, /does not currently operate a separate analytics/i);
  assert.match(privacy, /does not currently provide self-service deletion/i);
  assert.match(privacy, /request deletion.*contacting support/i);
  assert.doesNotMatch(
    privacy,
    /avatar|Google OAuth|GitHub OAuth|Standard Contractual Clauses|aggregated, de-identified usage/i,
  );
});

test("Refund Policy does not promise unimplemented automatic account changes", () => {
  const refund = legalText(refundPolicySections);

  assert.match(refund, /Approved refunds are processed through Paddle/i);
  assert.match(refund, /does not currently trigger an automatic downgrade/i);
  assert.doesNotMatch(
    refund,
    /will be canceled immediately|will be downgraded|within 3.?5 business days/i,
  );
});

test("all legal documents use the confirmed support address and production URLs", () => {
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
