import assert from "node:assert/strict";
import test from "node:test";

import {
  getOnboardingStarterGenerateUrl,
  ONBOARDING_STARTER_TEMPLATE_SLUG,
  ONBOARDING_STEPS,
} from "../src/config/onboarding";

test("onboarding follows the activation path before library", () => {
  const ids = ONBOARDING_STEPS.map((step) => step.id);

  assert.deepEqual(ids, [
    "dashboard",
    "templates",
    "generate-picker",
    "generate-flow",
    "generate-save",
    "library",
    "complete",
  ]);

  const generateFlowIndex = ids.indexOf("generate-flow");
  const saveIndex = ids.indexOf("generate-save");
  const libraryIndex = ids.indexOf("library");

  assert.ok(generateFlowIndex < saveIndex);
  assert.ok(saveIndex < libraryIndex);
});

test("starter template deep link targets LinkedIn Post", () => {
  assert.equal(ONBOARDING_STARTER_TEMPLATE_SLUG, "linkedin-post");
  assert.equal(
    getOnboardingStarterGenerateUrl(),
    "/generate?template=linkedin-post",
  );
});