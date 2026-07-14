import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildTemplateQaFixtures,
  type TemplateQaFixtureKind,
} from "../src/lib/templates/generation-qa-fixtures";
import {
  CATEGORY_QA_RULE_SETS,
  getQaRuleSetForTemplateCategory,
} from "../src/lib/templates/generation-qa-rules";
import {
  findRenderedPromptIssues,
  fillPromptTemplate,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";
import type { TemplateCategory, TemplateVariable } from "../src/types/template";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type CatalogTemplate = {
  slug: string;
  title: string;
  category: TemplateCategory;
  prompt: string;
  variables: unknown;
};

type FormSchema = {
  slug: string;
  title: string;
  variables: unknown;
};

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");

const RESTRICTION_FIELD_PATTERN =
  /(?:avoid|doNotUse|restriction|prohibited|forbidden|compliance|privacy|sensitive|regulated|claimsAndRestrictions|claimsRestrictions|contentToAvoid|wordsToAvoid|additionalRequirements)/i;
const STRONG_CONTRACT_PATTERN =
  /(?:HARD USER RESTRICTIONS|DO NOT USE|FINAL (?:QUALITY )?CHECK|TRUTHFULNESS|SAFEGUARDS|Do not|Never|Restrictions|Prohibited)/i;

function formVariablesFor(slug: string): TemplateVariable[] {
  const schema = readJson<FormSchema>(
    "src",
    "config",
    "template-forms",
    `${slug}-variables.json`,
  );
  assert.equal(schema.slug, slug);
  return parseTemplateVariables(schema.variables);
}

function isRestrictionField(variable: TemplateVariable): boolean {
  return RESTRICTION_FIELD_PATTERN.test(`${variable.key} ${variable.label}`);
}

function assertControlContract(
  template: CatalogTemplate,
  variable: TemplateVariable,
): void {
  const source = template.prompt;
  const key = variable.key;

  if (/variant|numberOfVariants/i.test(key)) {
    assert.match(
      source,
      /variant|version|option|exact|number/i,
      `${template.slug}.${key} needs a variant/count contract`,
    );
  }

  if (/emailCount|numberOfEmails/i.test(key)) {
    assert.match(
      source,
      /number of emails|exact number|matches|email count|\{\{emailCount\}\}/i,
      `${template.slug}.${key} needs an email-count contract`,
    );
  }

  if (/includePlainTextVersions/i.test(key)) {
    assert.match(
      source,
      /plain[- ]text/i,
      `${template.slug}.${key} needs a plain-text contract`,
    );
  }

  if (/optOut/i.test(key)) {
    assert.match(
      source,
      /opt[- ]out|decline|unsubscribe/i,
      `${template.slug}.${key} needs an opt-out contract`,
    );
  }

  if (/accessibility|altText/i.test(key)) {
    assert.match(
      source,
      /accessibility|alt[- ]text/i,
      `${template.slug}.${key} needs an accessibility contract`,
    );
  }

  if (/disclosure|affiliation|relationship/i.test(key)) {
    assert.match(
      source,
      /disclosure|affiliate|affiliation|sponsor|relationship/i,
      `${template.slug}.${key} needs a disclosure contract`,
    );
  }
}

test("QA category rule sets cover every template category without overloading hard failures", () => {
  assert.equal(CATEGORY_QA_RULE_SETS.length, 10);

  for (const template of catalog) {
    const ruleSet = getQaRuleSetForTemplateCategory(template.category);
    assert.ok(ruleSet, `${template.slug} needs a QA rule set`);
    assert.ok(ruleSet.hardFailRules.includes("exact user-prohibited phrase"));
    assert.ok(ruleSet.hardFailRules.includes("fake placeholder URLs"));
    assert.ok(ruleSet.warningRules.length > 0);
    assert.ok(ruleSet.expectations.length > 0);
  }
});

test("QA fixtures render all 45 templates in required-only, full-field, and restriction-stress modes", () => {
  const fixtureCounts: Record<TemplateQaFixtureKind, number> = {
    "required-only": 0,
    "full-field": 0,
    "restriction-stress": 0,
  };

  for (const template of catalog) {
    const variables = formVariablesFor(template.slug);
    const fixtures = buildTemplateQaFixtures(template.slug, variables);

    assert.ok(
      fixtures.some((fixture) => fixture.kind === "required-only"),
      `${template.slug} needs required-only fixture`,
    );
    assert.ok(
      fixtures.some((fixture) => fixture.kind === "full-field"),
      `${template.slug} needs full-field fixture`,
    );

    for (const fixture of fixtures) {
      fixtureCounts[fixture.kind] += 1;
      assert.equal(
        validateVariableValues(variables, fixture.values),
        null,
        `${template.slug} ${fixture.kind} fixture should validate`,
      );

      const rendered = fillPromptTemplate(
        template.prompt,
        fixture.values,
        variables,
      );
      assert.deepEqual(
        findRenderedPromptIssues(rendered, variables),
        { unresolvedVariables: [], unsafeTokens: [] },
        `${template.slug} ${fixture.kind} fixture should render safely`,
      );
      assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
      assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/i);
    }
  }

  assert.equal(fixtureCounts["required-only"], 45);
  assert.equal(fixtureCounts["full-field"], 45);
  assert.ok(
    fixtureCounts["restriction-stress"] > 0,
    "Restriction-stress fixtures should exist for templates with restriction fields",
  );
});

test("restriction-like fields are covered by a strong prompt contract", () => {
  for (const template of catalog) {
    const variables = formVariablesFor(template.slug);
    const restrictionFields = variables.filter(isRestrictionField);
    if (restrictionFields.length === 0) continue;

    assert.match(
      template.prompt,
      STRONG_CONTRACT_PATTERN,
      `${template.slug} needs a strong restriction contract`,
    );

    for (const variable of restrictionFields) {
      assert.match(
        template.prompt,
        new RegExp(`\\{\\{${variable.key}\\}\\}`),
        `${template.slug}.${variable.key} should appear in the prompt`,
      );
    }
  }
});

test("output control fields have explicit prompt contracts", () => {
  for (const template of catalog) {
    const variables = formVariablesFor(template.slug);
    for (const variable of variables) {
      if (
        /variant|numberOfVariants|emailCount|numberOfEmails|includePlainTextVersions|optOut|accessibility|altText|disclosure|affiliation|relationship/i.test(
          `${variable.key} ${variable.label}`,
        )
      ) {
        assertControlContract(template, variable);
      }
    }
  }
});
