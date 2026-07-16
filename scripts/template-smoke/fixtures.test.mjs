/**
 * Offline fixture / schema tests (no browser, no OpenAI).
 *
 * Run: node scripts/template-smoke/fixtures.test.mjs
 */
import assert from "node:assert/strict";
import {
  buildFieldPlan,
  readTemplateSchema,
  resolveTemplateSlug,
  SLUG_ALIASES,
} from "./fixtures.mjs";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const SHORT_FORM_REQUIRED = [
  "videoTopic",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "essentialFacts",
  "outputLanguage",
];

console.log("fixtures.test.mjs\n");

test("resolveTemplateSlug maps short-form-video-script → short-form-video", () => {
  const r = resolveTemplateSlug("short-form-video-script");
  assert.equal(r.requestedSlug, "short-form-video-script");
  assert.equal(r.canonicalSlug, "short-form-video");
  assert.equal(r.aliased, true);
  assert.equal(SLUG_ALIASES["short-form-video-script"], "short-form-video");
});

test("resolveTemplateSlug leaves canonical short-form-video unchanged", () => {
  const r = resolveTemplateSlug("short-form-video");
  assert.equal(r.canonicalSlug, "short-form-video");
  assert.equal(r.requestedSlug, "short-form-video");
  assert.equal(r.aliased, false);
});

test("short-form-video schema loads from variables.json", () => {
  const schema = readTemplateSchema("short-form-video");
  assert.equal(schema.slug, "short-form-video");
  assert.equal(schema.title, "Short-Form Video Script");
  assert.ok(Array.isArray(schema.variables));
  assert.ok(schema.variables.length >= 6);
  for (const key of SHORT_FORM_REQUIRED) {
    assert.ok(
      schema.requiredKeys.includes(key) ||
        schema.variables.some((v) => v.key === key && v.required),
      `missing required key ${key}`,
    );
  }
});

test("short-form-video-script alias loads same schema file", () => {
  const viaAlias = readTemplateSchema("short-form-video-script");
  const viaCanonical = readTemplateSchema("short-form-video");
  assert.equal(viaAlias.slug, "short-form-video");
  assert.deepEqual(viaAlias.requiredKeys, viaCanonical.requiredKeys);
  assert.equal(viaAlias.variables.length, viaCanonical.variables.length);
});

test("buildFieldPlan(short-form-video) fills all required fields", () => {
  const plan = buildFieldPlan("short-form-video", { smokeGoal: "normal" });
  assert.equal(plan.slug, "short-form-video");
  assert.equal(plan.requestedSlug, "short-form-video");
  assert.equal(plan.aliased, false);
  assert.equal(plan.title, "Short-Form Video Script");

  for (const key of SHORT_FORM_REQUIRED) {
    assert.ok(plan.requiredKeys.includes(key), `requiredKeys missing ${key}`);
    const field = plan.fields.find((f) => f.key === key);
    assert.ok(field, `planned field missing ${key}`);
    assert.ok(
      String(field.value ?? "").trim().length > 0,
      `empty plan value for ${key}`,
    );
    assert.ok(field.required, `${key} should be marked required in plan`);
  }
});

test("buildFieldPlan(short-form-video-script) alias dry-run plan matches canonical", () => {
  const aliased = buildFieldPlan("short-form-video-script", {
    smokeGoal: "normal",
  });
  const canonical = buildFieldPlan("short-form-video", { smokeGoal: "normal" });

  assert.equal(aliased.slug, "short-form-video");
  assert.equal(aliased.requestedSlug, "short-form-video-script");
  assert.equal(aliased.aliased, true);
  assert.deepEqual(aliased.requiredKeys, canonical.requiredKeys);
  assert.deepEqual(
    aliased.fields.map((f) => f.key).sort(),
    canonical.fields.map((f) => f.key).sort(),
  );

  for (const key of SHORT_FORM_REQUIRED) {
    const field = aliased.fields.find((f) => f.key === key);
    assert.ok(field, `alias plan missing required ${key}`);
    assert.ok(String(field.value ?? "").trim(), `alias empty value for ${key}`);
  }

  // Normal goal: restriction left empty (not required for dry-run readiness).
  assert.equal(aliased.requireRestriction, false);
});

test("short-form-video fixtures use realistic videoTopic / essentialFacts", () => {
  const plan = buildFieldPlan("short-form-video");
  assert.match(plan.plannedValues.videoTopic, /content/i);
  assert.match(plan.plannedValues.essentialFacts, /outline|planner|hooks/i);
  assert.ok(plan.plannedValues.primaryGoal);
  assert.ok(plan.plannedValues.outputLanguage);
});

const IN_APP_UX_REQUIRED = [
  "productOrFeature",
  "interfaceContext",
  "workflowGoal",
  "targetUsers",
  "uxElements",
  "keyFacts",
];

test("resolveTemplateSlug maps ux-copy → in-app-ux-copy", () => {
  const r = resolveTemplateSlug("ux-copy");
  assert.equal(r.requestedSlug, "ux-copy");
  assert.equal(r.canonicalSlug, "in-app-ux-copy");
  assert.equal(r.aliased, true);
  assert.equal(SLUG_ALIASES["ux-copy"], "in-app-ux-copy");
});

test("resolveTemplateSlug leaves canonical in-app-ux-copy unchanged", () => {
  const r = resolveTemplateSlug("in-app-ux-copy");
  assert.equal(r.canonicalSlug, "in-app-ux-copy");
  assert.equal(r.requestedSlug, "in-app-ux-copy");
  assert.equal(r.aliased, false);
});

test("in-app-ux-copy schema loads from variables.json", () => {
  const schema = readTemplateSchema("in-app-ux-copy");
  assert.equal(schema.slug, "in-app-ux-copy");
  assert.equal(schema.title, "In-App UX Copy");
  assert.ok(Array.isArray(schema.variables));
  for (const key of IN_APP_UX_REQUIRED) {
    assert.ok(
      schema.requiredKeys.includes(key) ||
        schema.variables.some((v) => v.key === key && v.required),
      `missing required key ${key}`,
    );
  }
});

test("ux-copy alias loads same schema as in-app-ux-copy", () => {
  const viaAlias = readTemplateSchema("ux-copy");
  const viaCanonical = readTemplateSchema("in-app-ux-copy");
  assert.equal(viaAlias.slug, "in-app-ux-copy");
  assert.deepEqual(viaAlias.requiredKeys, viaCanonical.requiredKeys);
  assert.equal(viaAlias.variables.length, viaCanonical.variables.length);
});

test("buildFieldPlan(in-app-ux-copy) fills all required fields", () => {
  const plan = buildFieldPlan("in-app-ux-copy", { smokeGoal: "normal" });
  assert.equal(plan.slug, "in-app-ux-copy");
  assert.equal(plan.requestedSlug, "in-app-ux-copy");
  assert.equal(plan.aliased, false);
  assert.equal(plan.title, "In-App UX Copy");

  for (const key of IN_APP_UX_REQUIRED) {
    assert.ok(plan.requiredKeys.includes(key), `requiredKeys missing ${key}`);
    const field = plan.fields.find((f) => f.key === key);
    assert.ok(field, `planned field missing ${key}`);
    assert.ok(
      String(field.value ?? "").trim().length > 0,
      `empty plan value for ${key}`,
    );
    assert.ok(field.required, `${key} should be marked required in plan`);
  }
});

test("buildFieldPlan(ux-copy) alias resolves and fills required fields", () => {
  const aliased = buildFieldPlan("ux-copy", { smokeGoal: "normal" });
  const canonical = buildFieldPlan("in-app-ux-copy", { smokeGoal: "normal" });

  assert.equal(aliased.slug, "in-app-ux-copy");
  assert.equal(aliased.requestedSlug, "ux-copy");
  assert.equal(aliased.aliased, true);
  assert.deepEqual(aliased.requiredKeys, canonical.requiredKeys);
  assert.deepEqual(
    aliased.fields.map((f) => f.key).sort(),
    canonical.fields.map((f) => f.key).sort(),
  );

  for (const key of IN_APP_UX_REQUIRED) {
    const field = aliased.fields.find((f) => f.key === key);
    assert.ok(field, `alias plan missing required ${key}`);
    assert.ok(String(field.value ?? "").trim(), `alias empty value for ${key}`);
  }

  assert.equal(aliased.requireRestriction, false);
});

test("in-app-ux-copy fixtures use realistic product/interface values", () => {
  const plan = buildFieldPlan("in-app-ux-copy");
  assert.match(plan.plannedValues.productOrFeature, /Creatornivo/i);
  assert.match(plan.plannedValues.interfaceContext, /library|empty/i);
  assert.match(plan.plannedValues.uxElements, /CTA|heading|button/i);
  assert.match(plan.plannedValues.keyFacts, /generations|UTC|library/i);
});

if (!process.exitCode) {
  console.log(`\n${passed} tests passed`);
}
