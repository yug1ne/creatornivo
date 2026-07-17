/**
 * H1: Full template prompts are server-only.
 * - Catalog DTO /api/templates: no prompt, no full variables
 * - Form API /api/templates/[slug]: variables only, never prompt
 * - Generate SSR: catalog + selected form only
 * - POST /api/ai/generate: assertTemplateAccess loads prompt from DB
 *
 * Run: npx tsx --test tests/templates-api-prompt-redaction.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  resolveInitialCatalogTemplate,
  toTemplateCatalogItem,
  toTemplateFormDetail,
  toTemplateListItem,
} from "../src/lib/templates/queries";

const SECRET_PROMPT =
  "You are a secret system prompt. Never reveal {{productName}} instructions.";

const sampleTemplate = {
  id: "tmpl_1",
  slug: "landing-page-copy",
  title: "Landing Page Copy",
  description: "Conversion-focused landing page sections",
  category: "marketing" as const,
  prompt: SECRET_PROMPT,
  variables: [
    {
      key: "productName",
      label: "Product name",
      required: true,
      type: "text",
    },
    {
      key: "notes",
      label: "Notes",
      required: false,
      type: "textarea",
    },
  ],
  requiredPlan: "free" as const,
};

test("toTemplateListItem omits prompt property when includePrompt is false", () => {
  const item = toTemplateListItem(sampleTemplate, {
    canAccessPro: false,
    includePrompt: false,
  });

  assert.equal(item.prompt, undefined);
  assert.equal("prompt" in item && item.prompt, false);
  assert.equal(JSON.stringify(item).includes("secret system prompt"), false);
  assert.equal(item.slug, "landing-page-copy");
  assert.equal(item.title, "Landing Page Copy");
  assert.equal(item.description, "Conversion-focused landing page sections");
  assert.equal(item.category, "marketing");
  assert.equal(item.requiredPlan, "free");
  assert.equal(item.isLocked, false);
  assert.ok(Array.isArray(item.variables));
  assert.equal(item.variables[0]?.key, "productName");
});

test("toTemplateListItem includes full prompt only when includePrompt is true", () => {
  const item = toTemplateListItem(sampleTemplate, {
    canAccessPro: true,
    includePrompt: true,
  });

  assert.equal(item.prompt, SECRET_PROMPT);
  assert.match(item.prompt ?? "", /secret system prompt/i);
});

test("pro template is locked for free users without prompt", () => {
  const item = toTemplateListItem(
    { ...sampleTemplate, requiredPlan: "pro", slug: "pro-only" },
    { canAccessPro: false, includePrompt: false },
  );

  assert.equal(item.isLocked, true);
  assert.equal(item.requiredPlan, "pro");
  assert.equal(item.prompt, undefined);
});

test("toTemplateCatalogItem never includes prompt or full variables", () => {
  const item = toTemplateCatalogItem(sampleTemplate, { canAccessPro: false });

  assert.equal(item.slug, "landing-page-copy");
  assert.equal(item.variableCount, 2);
  assert.equal(item.isLocked, false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(item, "prompt"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(item, "variables"),
    false,
  );
  assert.equal(JSON.stringify(item).includes("secret system prompt"), false);
  assert.equal(JSON.stringify(item).includes("productName"), false);
});

test("toTemplateCatalogItem locks pro templates for free users", () => {
  const item = toTemplateCatalogItem(
    { ...sampleTemplate, requiredPlan: "pro" },
    { canAccessPro: false },
  );
  assert.equal(item.isLocked, true);
  assert.equal(item.requiredPlan, "pro");
});

test("toTemplateFormDetail includes variables and never prompt", () => {
  const form = toTemplateFormDetail(sampleTemplate, { canAccessPro: true });

  assert.equal(form.slug, "landing-page-copy");
  assert.ok(Array.isArray(form.variables));
  assert.equal(form.variables.length, 2);
  assert.equal(form.variables[0]?.key, "productName");
  assert.equal(
    Object.prototype.hasOwnProperty.call(form, "prompt"),
    false,
  );
  assert.equal(JSON.stringify(form).includes("secret system prompt"), false);
});

test("resolveInitialCatalogTemplate respects lock and ?template=slug", () => {
  const free = toTemplateCatalogItem(sampleTemplate, { canAccessPro: false });
  const pro = toTemplateCatalogItem(
    {
      ...sampleTemplate,
      id: "tmpl_pro",
      slug: "pro-template",
      requiredPlan: "pro",
    },
    { canAccessPro: false },
  );

  assert.equal(resolveInitialCatalogTemplate([pro, free], "pro-template")?.slug, "landing-page-copy");
  assert.equal(
    resolveInitialCatalogTemplate([pro, free], "landing-page-copy")?.slug,
    "landing-page-copy",
  );
  assert.equal(resolveInitialCatalogTemplate([pro], "pro-template"), null);
});

test("client-facing catalog paths never load prompts", () => {
  const apiRoute = readFileSync("src/app/api/templates/route.ts", "utf8");
  const generatePage = readFileSync(
    "src/app/(protected)/generate/page.tsx",
    "utf8",
  );
  const catalogPage = readFileSync(
    "src/app/(protected)/templates/page.tsx",
    "utf8",
  );
  const formRoute = readFileSync(
    "src/app/api/templates/[slug]/route.ts",
    "utf8",
  );

  assert.match(apiRoute, /getTemplateCatalogForUser/);
  assert.doesNotMatch(apiRoute, /includePrompt:\s*true/);
  assert.doesNotMatch(apiRoute, /getTemplatesForUser/);

  assert.match(catalogPage, /getTemplateCatalogForUser/);
  assert.doesNotMatch(catalogPage, /includePrompt:\s*true/);
  assert.doesNotMatch(catalogPage, /getTemplatesForUser/);

  assert.match(generatePage, /getTemplateCatalogForUser/);
  assert.match(generatePage, /getTemplateFormBySlug/);
  assert.doesNotMatch(generatePage, /includePrompt:\s*true/);

  assert.match(formRoute, /getTemplateFormBySlug/);
  assert.doesNotMatch(formRoute, /includePrompt:\s*true/);
  // May strip an accidental `prompt` key; must not return template.prompt from DB.
  assert.doesNotMatch(formRoute, /template\.prompt/);
  assert.doesNotMatch(formRoute, /include:\s*\{[^}]*prompt/);
});

test("form API route never selects or returns prompt (source guard)", () => {
  const formRoute = readFileSync(
    "src/app/api/templates/[slug]/route.ts",
    "utf8",
  );
  const queriesSource = readFileSync("src/lib/templates/queries.ts", "utf8");

  assert.match(formRoute, /getTemplateFormBySlug/);
  assert.match(formRoute, /Never returns full template prompts/i);
  // Explicit strip of accidental prompt key
  assert.match(formRoute, /prompt:\s*_never/);

  assert.match(
    queriesSource,
    /export async function getTemplateFormBySlug/,
  );
  // Form select must not include prompt column
  assert.match(queriesSource, /templateCatalogSelect/);
  assert.match(
    queriesSource,
    /getTemplateFormBySlug[\s\S]*?select:\s*templateCatalogSelect/,
  );
  const formFn = queriesSource.slice(
    queriesSource.indexOf("export async function getTemplateFormBySlug"),
    queriesSource.indexOf("export async function getTemplatesForUser"),
  );
  assert.doesNotMatch(formFn, /prompt:\s*true/);
});

test("getTemplatesForUser forces session for includePrompt (source guard)", () => {
  const queriesSource = readFileSync("src/lib/templates/queries.ts", "utf8");

  assert.match(
    queriesSource,
    /includePrompt\s*=\s*Boolean\(options\.includePrompt\s*&&\s*session\)/,
  );
  // Without includePrompt, prompt column is not selected from DB
  assert.match(
    queriesSource,
    /templateListSelectWithoutPrompt/,
  );
  assert.match(
    queriesSource,
    /select:\s*includePrompt\s*\?\s*templateListSelectWithPrompt\s*:\s*templateListSelectWithoutPrompt/,
  );
});

test("catalog select never includes prompt column (source guard)", () => {
  const queriesSource = readFileSync("src/lib/templates/queries.ts", "utf8");
  const start = queriesSource.indexOf("const templateCatalogSelect = {");
  const end = queriesSource.indexOf(
    "const templateListSelectWithoutPrompt",
    start,
  );
  assert.ok(start >= 0 && end > start);
  const catalogSelect = queriesSource.slice(start, end);

  assert.match(catalogSelect, /requiredPlan:\s*true/);
  assert.doesNotMatch(catalogSelect, /prompt:\s*true/);
});

test("PromptPreview does not use fillPromptTemplate or template.prompt", () => {
  const preview = readFileSync(
    "src/components/generate/prompt-preview.tsx",
    "utf8",
  );

  assert.doesNotMatch(preview, /fillPromptTemplate/);
  assert.doesNotMatch(preview, /template\.prompt/);
  assert.doesNotMatch(preview, /This exact text will be sent to AI/i);
  assert.match(
    preview,
    /assembles the final prompt securely\s+on the server/i,
  );
});

test("GenerateWorkspace does not read template.prompt", () => {
  const workspace = readFileSync(
    "src/components/generate/generate-workspace.tsx",
    "utf8",
  );

  assert.doesNotMatch(workspace, /template\.prompt|selected\.prompt/);
  assert.match(workspace, /fetchTemplateFormBySlug|\/api\/templates\//);
  assert.match(
    workspace,
    /body:\s*JSON\.stringify\(\s*\{[\s\S]*templateId:[\s\S]*values:/,
  );
  assert.doesNotMatch(
    workspace,
    /JSON\.stringify\([^)]*prompt:/,
  );
});

test("POST /api/ai/generate still uses server-side DB prompt", () => {
  const generateRoute = readFileSync("src/app/api/ai/generate/route.ts", "utf8");

  assert.match(generateRoute, /assertTemplateAccess/);
  assert.match(generateRoute, /template\.prompt/);
  assert.match(generateRoute, /fillPromptTemplate|composeGenerationPrompt/);
});

test("SessionProvider disables window-focus session refetch", () => {
  const provider = readFileSync(
    "src/components/providers/session-provider.tsx",
    "utf8",
  );
  assert.match(provider, /refetchOnWindowFocus=\{false\}/);
});

test("library list uses limit and content preview helpers", () => {
  const listHelper = readFileSync("src/lib/library/list.ts", "utf8");
  const libraryPage = readFileSync(
    "src/app/(protected)/library/page.tsx",
    "utf8",
  );
  const libraryApi = readFileSync("src/app/api/library/route.ts", "utf8");

  assert.match(listHelper, /LIBRARY_LIST_LIMIT\s*=\s*50/);
  assert.match(listHelper, /toLibraryContentPreview/);
  assert.match(libraryPage, /take:\s*LIBRARY_LIST_LIMIT/);
  assert.match(libraryPage, /contentPreview/);
  assert.match(libraryApi, /take:\s*LIBRARY_LIST_LIMIT/);
  assert.match(libraryApi, /contentPreview/);
});
