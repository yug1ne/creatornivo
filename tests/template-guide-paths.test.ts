/**
 * Paths-only guide registry + Help button import-graph regression tests.
 * Prevents reintroducing full form JSON into the /generate client bundle.
 *
 * Run: npx tsx --test tests/template-guide-paths.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getTemplateGuidePath,
  TEMPLATE_GUIDE_PATHS,
} from "../src/config/template-guide-paths";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function listPromptSlugs(): string[] {
  return readdirSync(path.join(root, "prisma", "template-prompts"))
    .filter((name) => name.endsWith(".txt"))
    .map((name) => name.replace(/\.txt$/, ""))
    .sort();
}

test("TEMPLATE_GUIDE_PATHS covers every template prompt slug exactly once", () => {
  const promptSlugs = listPromptSlugs();
  const registrySlugs = Object.keys(TEMPLATE_GUIDE_PATHS).sort();

  assert.equal(promptSlugs.length, 45);
  assert.deepEqual(registrySlugs, promptSlugs);

  for (const slug of promptSlugs) {
    const expected = `/generate/guides/${slug}`;
    assert.equal(
      TEMPLATE_GUIDE_PATHS[slug as keyof typeof TEMPLATE_GUIDE_PATHS],
      expected,
      `${slug} path must be ${expected}`,
    );
    assert.equal(getTemplateGuidePath(slug), expected);
  }

  assert.equal(getTemplateGuidePath("not-a-template"), undefined);
});

test("paths-only registry source does not import form schemas or prompts", () => {
  const registrySource = readProjectFile(
    "src",
    "config",
    "template-guide-paths.ts",
  );

  // Forbid real imports / JSON loads (comments may mention these paths).
  assert.doesNotMatch(
    registrySource,
    /from\s+["']@\/config\/template-forms/,
  );
  assert.doesNotMatch(registrySource, /variables\.json/);
  assert.doesNotMatch(registrySource, /template-prompts\//);
  assert.doesNotMatch(registrySource, /templates-catalog\.json/);
  assert.doesNotMatch(registrySource, /\bimport\s+formSchema\b/);
  assert.doesNotMatch(registrySource, /^import\s.+/m);
});

test("template-help-button uses paths-only registry and never form modules", () => {
  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );

  assert.match(helpButton, /["']use client["']/);
  assert.match(
    helpButton,
    /from ["']@\/config\/template-guide-paths["']/,
  );
  assert.match(helpButton, /getTemplateGuidePath/);

  assert.doesNotMatch(helpButton, /@\/config\/template-forms/);
  assert.doesNotMatch(helpButton, /variables\.json/);
  assert.doesNotMatch(helpButton, /_GUIDE_PATH/);
  assert.doesNotMatch(helpButton, /formSchema/);
  assert.doesNotMatch(helpButton, /FormVariables/);
});
