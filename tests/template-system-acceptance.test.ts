import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  findRenderedPromptIssues,
  fillPromptTemplate,
  isTemplateFieldVisible,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type CatalogTemplate = {
  slug: string;
  title: string;
  description: string;
  category: string;
  requiredPlan: "free" | "pro";
  prompt: string;
  variables: Array<{
    key: string;
    label: string;
    placeholder?: string;
    required: boolean;
    type?: string;
    options?: string[];
  }>;
};

type FormSchema = {
  slug: string;
  title: string;
  fieldCount: number;
  requiredKeys: string[];
  groups: Array<{
    id: string;
    title: string;
    description?: string;
    defaultOpen?: boolean;
  }>;
  variables: unknown;
};

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

function listSlugsFromFiles(...parts: string[]): string[] {
  return readdirSync(path.join(root, ...parts))
    .filter((name) => name.endsWith(".txt"))
    .map((name) => name.replace(/\.txt$/, ""))
    .sort();
}

function listFormSlugs(): string[] {
  return readdirSync(path.join(root, "src", "config", "template-forms"))
    .filter((name) => name.endsWith("-variables.json"))
    .map((name) => name.replace(/-variables\.json$/, ""))
    .sort();
}

function listGuideSlugs(): string[] {
  const guideRoot = path.join(
    root,
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
  );

  return readdirSync(guideRoot)
    .filter((name) => statSync(path.join(guideRoot, name)).isDirectory())
    .sort();
}

function extractPromptVariables(prompt: string): string[] {
  return [
    ...new Set(
      [...prompt.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function duplicateValues(values: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function countBy<T>(items: readonly T[], keyFor: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFor(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function buildFilledValues(schema: FormSchema): Record<string, string> {
  const variables = parseTemplateVariables(schema.variables);
  const values = buildDefaultValues(variables);

  for (const variable of variables) {
    if (variable.format === "url") {
      values[variable.key] = `https://www.creatornivo.com/${schema.slug}`;
    } else if (variable.type === "select" && variable.options?.length) {
      values[variable.key] = variable.defaultValue ?? variable.options[0] ?? "";
    } else if (variable.type === "number") {
      values[variable.key] = variable.defaultValue ?? String(variable.min ?? 1);
    } else if (variable.maxLength !== undefined && variable.maxLength <= 12) {
      values[variable.key] = "Value ✓".slice(0, variable.maxLength);
    } else if (variable.maxLength !== undefined && variable.maxLength < 50) {
      values[variable.key] = `Value ✓ "x"`.slice(0, variable.maxLength);
    } else {
      values[variable.key] =
        variable.defaultValue ??
        `${variable.label}: unicode ✓, quote "value", newline\nsecond line`;
    }
  }

  return values;
}

function shortSafeValue(maxLength: number | undefined, fallback: string): string {
  if (maxLength !== undefined && maxLength <= 12) {
    return "Value ✓".slice(0, maxLength);
  }
  if (maxLength !== undefined && maxLength < fallback.length) {
    return fallback.slice(0, maxLength);
  }
  return fallback;
}

const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
const summary = readJson<Array<{ slug: string; category: string; plan: string; vars: number }>>(
  "prisma",
  "templates-summary.json",
);
const catalogSlugs = catalog.map((template) => template.slug).sort();

test("template registry has the expected inventory and stable unique slugs", () => {
  assert.equal(catalog.length, 45);
  assert.deepEqual(countBy(catalog, (template) => template.requiredPlan), {
    free: 15,
    pro: 30,
  });
  assert.deepEqual(countBy(catalog, (template) => template.category), {
    app_ux: 3,
    blog: 1,
    community: 6,
    ecommerce: 3,
    email: 2,
    facebook_post: 1,
    google_business: 1,
    instagram_post: 2,
    linkedin_post: 2,
    marketing: 6,
    newsletter: 1,
    pinterest: 1,
    product: 1,
    product_launch: 2,
    reddit: 1,
    sales: 3,
    seo: 2,
    threads_post: 1,
    tiktok: 1,
    x_thread: 1,
    youtube: 4,
  });
  assert.deepEqual(duplicateValues(catalog.map((template) => template.slug)), []);

  const summaryBySlug = new Map(summary.map((item) => [item.slug, item]));
  assert.deepEqual(sorted(summary.map((item) => item.slug)), catalogSlugs);
  for (const template of catalog) {
    const item = summaryBySlug.get(template.slug);
    assert.ok(item, `Missing summary row for ${template.slug}`);
    assert.equal(item.category, template.category);
    assert.equal(item.plan, template.requiredPlan);
    assert.equal(item.vars, template.variables.length);
  }
});

test("all registered templates have prompt files, form schemas, and guide routes", () => {
  assert.deepEqual(listSlugsFromFiles("prisma", "template-prompts"), catalogSlugs);
  assert.deepEqual(listFormSlugs(), catalogSlugs);
  assert.deepEqual(listGuideSlugs(), catalogSlugs);

  for (const template of catalog) {
    assert.ok(template.title, `${template.slug} needs a title`);
    assert.ok(template.description, `${template.slug} needs a description`);
    assert.match(template.requiredPlan, /^(free|pro)$/);
  }
});

test("runtime catalog prompts match prompt source files for every template", () => {
  const promptHashes = new Map<string, string[]>();

  for (const template of catalog) {
    const promptFile = readProjectFile(
      "prisma",
      "template-prompts",
      `${template.slug}.txt`,
    );
    assert.equal(
      normalizeLineEndings(template.prompt),
      normalizeLineEndings(promptFile),
      `${template.slug} catalog prompt must match prompt file`,
    );
    assert.doesNotMatch(promptFile, /\bundefined\b|\bnull\b|\[object Object\]/);

    const normalized = normalizeLineEndings(promptFile);
    promptHashes.set(normalized, [
      ...(promptHashes.get(normalized) ?? []),
      template.slug,
    ]);
  }

  const duplicatePrompts = [...promptHashes.values()].filter(
    (slugs) => slugs.length > 1,
  );
  assert.deepEqual(duplicatePrompts, []);
});

test("every prompt variable has exactly one matching form field and catalog variable", () => {
  for (const template of catalog) {
    const promptVariables = extractPromptVariables(template.prompt);
    const schema = readJson<FormSchema>(
      "src",
      "config",
      "template-forms",
      `${template.slug}-variables.json`,
    );
    const formVariables = parseTemplateVariables(schema.variables);
    const formKeys = formVariables.map((variable) => variable.key).sort();
    const catalogKeys = template.variables.map((variable) => variable.key).sort();

    assert.equal(schema.slug, template.slug);
    assert.equal(schema.title, template.title);
    assert.equal(schema.fieldCount, formVariables.length);
    assert.deepEqual(duplicateValues(formKeys), []);
    assert.deepEqual(formKeys, promptVariables, `${template.slug} form/prompt parity`);
    assert.deepEqual(catalogKeys, promptVariables, `${template.slug} catalog/prompt parity`);
    assert.deepEqual(
      sorted(schema.requiredKeys),
      sorted(formVariables.filter((variable) => variable.required).map((v) => v.key)),
      `${template.slug} required keys must match required form fields`,
    );
  }
});

test("all form fields have usable metadata, validation, groups, and conditional controls", () => {
  for (const template of catalog) {
    const schema = readJson<FormSchema>(
      "src",
      "config",
      "template-forms",
      `${template.slug}-variables.json`,
    );
    const formVariables = parseTemplateVariables(schema.variables);
    const formKeys = new Set(formVariables.map((variable) => variable.key));
    const groupIds = new Set(schema.groups.map((group) => group.id));

    assert.ok(schema.groups.length >= 1, `${template.slug} needs groups`);
    assert.equal(schema.groups[0]?.defaultOpen, true);

    for (const group of schema.groups) {
      assert.ok(group.title, `${template.slug} group ${group.id} needs a title`);
      assert.ok(
        group.description,
        `${template.slug} group ${group.id} needs a description`,
      );
    }

    for (const variable of formVariables) {
      assert.ok(variable.label, `${template.slug}.${variable.key} needs a label`);
      assert.ok(
        variable.placeholder,
        `${template.slug}.${variable.key} needs a placeholder`,
      );
      assert.ok(variable.hint, `${template.slug}.${variable.key} needs helper text`);
      assert.ok(variable.group, `${template.slug}.${variable.key} needs a group`);
      assert.ok(
        groupIds.has(variable.group),
        `${template.slug}.${variable.key} has an unknown group`,
      );
      assert.match(variable.type ?? "text", /^(text|textarea|select|number)$/);
      assert.ok(variable.help?.what, `${template.slug}.${variable.key} help.what`);
      assert.ok(variable.help?.why, `${template.slug}.${variable.key} help.why`);
      assert.ok(variable.help?.example, `${template.slug}.${variable.key} help.example`);
      assert.ok(variable.help?.avoid, `${template.slug}.${variable.key} help.avoid`);

      if (variable.type === "select") {
        assert.ok(
          variable.options && variable.options.length >= 2,
          `${template.slug}.${variable.key} select needs options`,
        );
        if (variable.defaultValue) {
          assert.ok(
            variable.options?.includes(variable.defaultValue),
            `${template.slug}.${variable.key} default must be in options`,
          );
        }
      }

      const showWhen = variable.showWhen;
      if (showWhen) {
        const clauses =
          "allOf" in showWhen
            ? showWhen.allOf
            : "anyOf" in showWhen
              ? showWhen.anyOf
              : [showWhen];
        for (const clause of clauses) {
          assert.ok(
            formKeys.has(clause.key),
            `${template.slug}.${variable.key} showWhen references missing key ${clause.key}`,
          );
        }
      }
    }
  }
});

test("filled prompts and prompt preview mapping handle required, optional, unicode, quotes, and newlines", () => {
  const route = readProjectFile("src", "app", "api", "ai", "generate", "route.ts");
  const preview = readProjectFile(
    "src",
    "components",
    "generate",
    "prompt-preview.tsx",
  );
  assert.match(route, /fillPromptTemplate\(template\.prompt, body\.values\)/);
  assert.match(preview, /fillPromptTemplate\(template\.prompt, values\)/);
  assert.doesNotMatch(preview, /highlightVariables/);

  for (const template of catalog) {
    const schema = readJson<FormSchema>(
      "src",
      "config",
      "template-forms",
      `${template.slug}-variables.json`,
    );
    const formVariables = parseTemplateVariables(schema.variables);
    const values = buildFilledValues(schema);

    assert.equal(
      validateVariableValues(formVariables, values),
      null,
      `${template.slug} filled values should pass validation`,
    );

    const rendered = fillPromptTemplate(template.prompt, values);
    assert.deepEqual(
      findRenderedPromptIssues(rendered, formVariables),
      { unresolvedVariables: [], unsafeTokens: [] },
      `${template.slug} full-field render should be safe`,
    );
    assert.match(rendered, /unicode ✓/);
    assert.match(rendered, /quote "value"/);
    assert.match(rendered, /second line/);

    const requiredOnly = buildDefaultValues(formVariables);
    for (const variable of formVariables) {
      if (variable.required || (variable.type === "select" && variable.options?.length)) {
        requiredOnly[variable.key] =
          variable.format === "url"
            ? `https://www.creatornivo.com/${template.slug}`
            : variable.type === "number"
              ? variable.defaultValue ?? String(variable.min ?? 1)
              : variable.defaultValue ??
                variable.options?.[0] ??
                shortSafeValue(
                  variable.maxLength,
                  `${variable.label} required value`,
                );
      }
    }
    assert.equal(
      validateVariableValues(formVariables, requiredOnly),
      null,
      `${template.slug} required-only values should pass validation`,
    );
    const requiredOnlyRendered = fillPromptTemplate(
      template.prompt,
      requiredOnly,
    );
    assert.doesNotMatch(requiredOnlyRendered, /\{\{[a-zA-Z0-9_]+\}\}/);
    assert.deepEqual(
      findRenderedPromptIssues(requiredOnlyRendered, formVariables),
      { unresolvedVariables: [], unsafeTokens: [] },
      `${template.slug} required-only render should be safe`,
    );

    for (const variable of formVariables) {
      if (variable.showWhen) {
        assert.equal(typeof isTemplateFieldVisible(variable, values), "boolean");
      }
    }
  }
});

test("required and optional render behavior is enforced before runtime generation", () => {
  const schema = readJson<FormSchema>(
    "src",
    "config",
    "template-forms",
    "facebook-post-variables.json",
  );
  const formVariables = parseTemplateVariables(schema.variables);
  const missingRequired = buildDefaultValues(formVariables);

  const validationError = validateVariableValues(
    formVariables,
    missingRequired,
  );
  assert.ok(validationError);
  assert.match(validationError, /Field "What is the post about\?" is required/);

  const rendered = fillPromptTemplate(
    "Required:\n{{requiredValue}}\nOptional:\n{{optionalValue}}\nDone",
    { requiredValue: "Ready", optionalValue: "" },
  );

  assert.equal(rendered, "Required:\nReady\nDone");
  assert.deepEqual(findRenderedPromptIssues(rendered), {
    unresolvedVariables: [],
    unsafeTokens: [],
  });
});

test("server render guard runs before quota, reservation, OpenAI, and usage writes", () => {
  const route = readProjectFile("src", "app", "api", "ai", "generate", "route.ts");
  const renderGuard = route.indexOf('code: "template_render_error"');
  const usageCheck = route.indexOf("await getUserUsageSnapshot(userId, user.plan)");
  const reservation = route.indexOf("await reserveGeneration");
  const openAiCall = route.indexOf("await createContentStream");
  const usageWrite = route.indexOf("await incrementUsage(userId, getUsagePeriodForPlan");

  assert.ok(renderGuard >= 0);
  assert.ok(usageCheck > renderGuard);
  assert.ok(reservation > renderGuard);
  assert.ok(openAiCall > renderGuard);
  assert.ok(usageWrite > renderGuard);
  assert.match(route, /findRenderedPromptIssues\(filledPrompt, variables\)/);
});

test("Help button mapping and guide pages cover every template", () => {
  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );

  for (const template of catalog) {
    const constName = `${template.slug
      .replace(/-/g, "_")
      .toUpperCase()}_GUIDE_PATH`;

    const mapKey = template.slug.includes("-")
      ? `"${template.slug}"`
      : template.slug;
    assert.match(helpButton, new RegExp(`${mapKey}: ${constName}`));

    const guidePage = readProjectFile(
      "src",
      "app",
      "(protected)",
      "generate",
      "guides",
      template.slug,
      "page.tsx",
    );
    const importedGuide = guidePage.match(
      /from "@\/components\/generate\/([^"]+)"/,
    )?.[1];
    const guideSource = importedGuide
      ? `${guidePage}\n${readProjectFile(
          "src",
          "components",
          "generate",
          `${importedGuide}.tsx`,
        )}`
      : guidePage;
    assert.match(guideSource, /TemplateFieldGuide/);
    assert.match(guideSource, new RegExp(`templateSlug=\"${template.slug}\"`));
  }
});
