import type { TemplateVariable } from "@/types/template";

import { buildDefaultValues } from "./utils";

export type TemplateQaFixtureKind =
  | "required-only"
  | "full-field"
  | "restriction-stress";

export interface TemplateQaFixture {
  kind: TemplateQaFixtureKind;
  slug: string;
  values: Record<string, string>;
}

const RESTRICTION_STRESS_TEXT = [
  'Avoid "effortlessly", "boost engagement", "guaranteed".',
  'Do not use "fake urgency", "never run out of ideas", "in minutes".',
  'Exclude "fake testimonial", "fake statistic", "placeholder link".',
].join("\n");

const RESTRICTION_FIELD_PATTERN =
  /(?:avoid|doNotUse|restriction|prohibited|forbidden|compliance|privacy|sensitive|regulated|claimsAndRestrictions|claimsRestrictions|contentToAvoid|wordsToAvoid|additionalRequirements)/i;

function safeValue(value: string, maxLength: number | undefined): string {
  if (maxLength !== undefined && value.length > maxLength) {
    return value.slice(0, maxLength);
  }
  return value;
}

function selectOption(
  variable: TemplateVariable,
  preferred: readonly string[],
): string {
  if (!variable.options?.length) return variable.defaultValue ?? "";

  return (
    preferred
      .map((option) =>
        variable.options?.find(
          (candidate) => candidate.toLowerCase() === option.toLowerCase(),
        ),
      )
      .find(Boolean) ??
    variable.defaultValue ??
    variable.options[0] ??
    ""
  );
}

function isRestrictionField(variable: TemplateVariable): boolean {
  return RESTRICTION_FIELD_PATTERN.test(`${variable.key} ${variable.label}`);
}

function valueForField(
  slug: string,
  variable: TemplateVariable,
  kind: TemplateQaFixtureKind,
): string {
  const key = variable.key.toLowerCase();

  if (variable.options?.length) {
    if (/plaintext|plaintext|plain.*text/.test(key)) {
      return selectOption(variable, ["Yes", "Enabled", "On"]);
    }
    if (/accessibility|alt/.test(key)) {
      return selectOption(variable, ["Yes", "Enabled", "On", "Concise"]);
    }
    if (/disclosure|relationship|affiliation/.test(key)) {
      return selectOption(variable, ["Yes", "Required", "Include", "Sponsored"]);
    }
    return variable.defaultValue ?? variable.options?.[0] ?? "";
  }

  if (
    kind === "restriction-stress" &&
    isRestrictionField(variable) &&
    variable.format !== "url" &&
    !/url|link|website/.test(key)
  ) {
    return safeValue(RESTRICTION_STRESS_TEXT, variable.maxLength);
  }

  const byKey: Record<string, string> = {
    desiredAction: "Enter an email address to receive the guide",
    primaryCta: "Reply if you would like the details",
    ctaPreference: "Ask permission to send details",
    disclosureText: "Disclosure: creator-owned resource.",
    affiliationDetails: "Author is the product founder.",
    commercialRelationship: "Creator-owned resource from the sender.",
    mandatoryDisclosures: "Disclosure: sponsored placement.",
    proofPoints: "Approved proof: automated template acceptance passed.",
    sourceMaterial: "Source material: internal QA fixture.",
    ctaUrl: `https://www.creatornivo.com/${slug}/cta`,
    destinationUrl: `https://www.creatornivo.com/${slug}/destination`,
  };

  if (byKey[variable.key]) {
    return safeValue(byKey[variable.key], variable.maxLength);
  }

  if (/slug/.test(key)) {
    return safeValue("qa-fixture-slug", variable.maxLength);
  }

  if (variable.format === "url" || /url|link|website/.test(key)) {
    return safeValue(
      `https://www.creatornivo.com/${slug}/${variable.key}`,
      variable.maxLength,
    );
  }

  if (variable.type === "number") {
    const preferred = /count|number|variant|email/.test(key) ? 3 : variable.min ?? 1;
    return String(variable.defaultValue ?? Math.min(preferred, variable.max ?? preferred));
  }

  return safeValue(
    `${variable.label} QA fixture value for ${slug}`,
    variable.maxLength,
  );
}

export function buildTemplateQaFixture(
  slug: string,
  variables: TemplateVariable[],
  kind: TemplateQaFixtureKind,
): TemplateQaFixture {
  const values = buildDefaultValues(variables);

  for (const variable of variables) {
    if (kind === "required-only" && !variable.required) {
      continue;
    }
    values[variable.key] = valueForField(slug, variable, kind);
  }

  return { kind, slug, values };
}

export function buildTemplateQaFixtures(
  slug: string,
  variables: TemplateVariable[],
): TemplateQaFixture[] {
  const fixtures: TemplateQaFixture[] = [
    buildTemplateQaFixture(slug, variables, "required-only"),
    buildTemplateQaFixture(slug, variables, "full-field"),
  ];

  if (variables.some(isRestrictionField)) {
    fixtures.push(buildTemplateQaFixture(slug, variables, "restriction-stress"));
  }

  return fixtures;
}
