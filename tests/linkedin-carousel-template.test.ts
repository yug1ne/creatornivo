import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

type CatalogTemplate = {
  slug: string;
  title: string;
  prompt: string;
};

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "linkedin-carousel.txt",
);

test("LinkedIn Carousel accessibility never emits empty None notes", () => {
  assert.match(prompt, /When \{\{includeAltText\}\} is enabled/);
  assert.match(prompt, /never output “Accessibility note: None.”/);
  assert.match(prompt, /omit that slide’s Accessibility note line/);
  assert.match(prompt, /document-level Accessibility Text/);
  assert.match(prompt, /Never write “None”; omit this line/);
});

test("LinkedIn Carousel keeps required disclosure public and softens overpromises", () => {
  assert.match(prompt, /When \{\{requiredDisclosure\}\} is supplied/);
  assert.match(prompt, /public caption or slide copy/);
  assert.match(prompt, /Do not place a required public disclosure only in Verification Notes or Production Notes/);
  assert.match(prompt, /organize a week of content ideas/);
  assert.match(prompt, /reduce last-minute planning pressure/);
  assert.match(prompt, /make planning feel more structured/);
  assert.match(prompt, /keep topics, hooks, CTAs, and notes in one place/);
  assert.match(prompt, /the supplied URL only when relevant/);
});

test("LinkedIn Carousel source prompt and runtime catalog stay in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "linkedin-carousel");

  assert.ok(template);
  assert.equal(template.title, "LinkedIn Carousel");
  assert.equal(template.prompt.trim(), prompt.trim());
});
