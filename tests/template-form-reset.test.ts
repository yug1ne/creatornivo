import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  areTemplateValuesAtDefaults,
} from "../src/components/generate/generate-workspace";
import {
  buildDefaultValues,
  fillPromptTemplate,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";
import type { TemplateVariable } from "../src/types/template";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type CatalogTemplate = {
  slug: string;
  prompt: string;
  variables: unknown;
};

type FormSchema = {
  slug: string;
  variables: unknown;
};

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

function readFormVariables(slug: string): TemplateVariable[] {
  const schema = readJson<FormSchema>(
    "src",
    "config",
    "template-forms",
    `${slug}-variables.json`,
  );
  return parseTemplateVariables(schema.variables);
}

test("reset defaults clear text and textarea values while restoring select and number defaults", () => {
  const facebookVariables = readFormVariables("facebook-post");
  const facebookDefaults = buildDefaultValues(facebookVariables);

  assert.equal(facebookDefaults.subjectOrOffer, "");
  assert.equal(facebookDefaults.offerDetails, "");
  assert.equal(facebookDefaults.postType, "Auto");
  assert.equal(facebookDefaults.primaryGoal, "Engagement");
  assert.equal(areTemplateValuesAtDefaults(facebookVariables, facebookDefaults), true);
  assert.equal(
    areTemplateValuesAtDefaults(facebookVariables, {
      ...facebookDefaults,
      subjectOrOffer: "Changed value",
    }),
    false,
  );

  const youtubeVariables = readFormVariables("youtube-video-package");
  const youtubeDefaults = buildDefaultValues(youtubeVariables);
  assert.equal(youtubeDefaults.titleVariantCount, "5");
  assert.equal(youtubeDefaults.toneStyle, "Clear and natural");
  assert.equal(areTemplateValuesAtDefaults(youtubeVariables, youtubeDefaults), true);
});

test("reset default builder is schema-driven for checkbox-like and boolean-like defaults", () => {
  const variables = [
    {
      key: "includeVisualConcept",
      label: "Include visual concept",
      required: false,
      defaultValue: "true",
    },
    {
      key: "extraNotes",
      label: "Extra notes",
      required: false,
    },
  ] satisfies TemplateVariable[];

  assert.deepEqual(buildDefaultValues(variables), {
    includeVisualConcept: "true",
    extraNotes: "",
  });
});

test("reset defaults make Generate invalid again when required fields are empty", () => {
  const variables = readFormVariables("facebook-post");
  const defaults = buildDefaultValues(variables);
  const validationError = validateVariableValues(variables, defaults);

  assert.ok(validationError);
  assert.match(validationError, /Field "What is the post about\?" is required/);
});

test("prompt preview output changes immediately when values reset to defaults", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "facebook-post");
  assert.ok(template);

  const variables = parseTemplateVariables(template.variables);
  const defaults = buildDefaultValues(variables);
  const filled = {
    ...defaults,
    subjectOrOffer: "A launch update",
    targetAudience: "Solo founders",
    keyMessage: "The product is now easier to use.",
    essentialFacts: "Creatornivo is in Early Access Beta.",
  };

  assert.notEqual(
    fillPromptTemplate(template.prompt, filled),
    fillPromptTemplate(template.prompt, defaults),
  );
});

test("all 45 templates have stable schema-based reset defaults", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  assert.equal(catalog.length, 45);

  for (const template of catalog) {
    const variables = parseTemplateVariables(template.variables);
    const defaults = buildDefaultValues(variables);

    assert.deepEqual(
      Object.keys(defaults).sort(),
      variables.map((variable) => variable.key).sort(),
      `${template.slug} reset defaults must match variable keys`,
    );

    for (const variable of variables) {
      assert.equal(
        defaults[variable.key],
        variable.defaultValue?.trim() ? variable.defaultValue : "",
        `${template.slug}.${variable.key} must use its schema default`,
      );
    }
  }
});

test("reset form UI asks for confirmation only for dirty forms and keeps the current template", () => {
  const source = readProjectFile(
    "src",
    "components",
    "generate",
    "generate-workspace.tsx",
  );

  assert.match(source, /disabled={isFormAtDefaults}/);
  assert.match(source, /aria-label="Reset form to default values"/);
  assert.match(source, /Reset form/);
  assert.match(source, /Reset all fields to their default values/);
  assert.match(source, /setResetConfirmOpen\(true\)/);
  assert.match(source, /if \(!selected \|\| isFormAtDefaults\) return/);
  assert.match(source, /setValues\(buildDefaultValues\(template\.variables\)\)/);
  assert.match(source, /url\.searchParams\.set\("template", template\.slug\)/);
});

test("reset confirmation cancel preserves values while confirm resets only form state", () => {
  const source = readProjectFile(
    "src",
    "components",
    "generate",
    "generate-workspace.tsx",
  );
  const resetBody = source.slice(
    source.indexOf("const resetCurrentForm"),
    source.indexOf("const handleResetRequest"),
  );

  assert.match(source, />\s*Cancel\s*<\/button>/);
  assert.match(source, />\s*Reset fields\s*<\/Button>/);
  assert.match(source, /onCancel={closeResetDialog}/);
  assert.match(source, /onConfirm={handleResetConfirm}/);
  assert.match(resetBody, /setValues\(buildDefaultValues\(selected\.variables\)\)/);
  assert.match(resetBody, /setFormResetVersion\(\(current\) => current \+ 1\)/);
  assert.doesNotMatch(resetBody, /setStreamedContent/);
  assert.doesNotMatch(resetBody, /setGenerationUsage/);
  assert.doesNotMatch(resetBody, /fetch\("\/api\/ai\/generate"/);
  assert.doesNotMatch(resetBody, /setSelectedId|router\.replace|setSavedCount/);
});

test("reset dialog accessibility and toolbar placement are wired", () => {
  const workspace = readProjectFile(
    "src",
    "components",
    "generate",
    "generate-workspace.tsx",
  );
  const form = readProjectFile(
    "src",
    "components",
    "generate",
    "template-parameters-form.tsx",
  );

  assert.match(workspace, /role="dialog"/);
  assert.match(workspace, /aria-modal="true"/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /resetButtonRef\.current\?\.focus\(\)/);
  assert.match(workspace, /ref={cancelButtonRef}/);
  assert.match(workspace, /key={`\$\{selected\.id\}-\$\{formResetVersion\}`}/);
  assert.match(form, /useState<Set<string>>\(initialOpen\)/);

  const expandIndex = form.indexOf("Expand all");
  const essentialsIndex = form.indexOf("Essentials only");
  const resetSlotIndex = form.indexOf("{toolbarAction}", essentialsIndex);
  const helpSlotIndex = form.indexOf("{toolbarEndAction}", resetSlotIndex);

  assert.ok(expandIndex >= 0);
  assert.ok(essentialsIndex > expandIndex);
  assert.ok(resetSlotIndex > essentialsIndex);
  assert.ok(helpSlotIndex > resetSlotIndex);
});
