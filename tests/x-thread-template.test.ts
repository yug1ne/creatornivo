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

const prompt = readProjectFile("prisma", "template-prompts", "x-thread.txt");

test("X Thread keeps ownership disclosure inside the copy-ready thread", () => {
  assert.match(prompt, /commercialRelationship/);
  assert.match(prompt, /Copy-Ready X Thread/);
  assert.match(prompt, /include a natural factual disclosure inside the copy-ready thread itself/);
  assert.match(prompt, /not only in Publishing Notes/);
  assert.match(prompt, /I built this as one example of the system/);
});

test("X Thread preserves educational structure and avoids fake artifacts", () => {
  assert.match(prompt, /Educational breakdown/);
  assert.match(prompt, /Step-by-step guide/);
  assert.match(prompt, /no URL, fact, quote, testimonial, result, or affiliation was invented/);
  assert.match(prompt, /Never invent:[\s\S]*statistics or research findings/);
  assert.match(prompt, /links or sources/);
  assert.match(prompt, /mild overpromises/);
  assert.match(prompt, /promising “no more” last-minute pressure/);
  assert.match(prompt, /will spend less time/);
});

test("X Thread source prompt and runtime catalog stay in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "x-thread");

  assert.ok(template);
  assert.equal(template.title, "X Thread");
  assert.equal(template.prompt.trim(), prompt.trim());
});
