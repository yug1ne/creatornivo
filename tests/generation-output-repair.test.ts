import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assessGeneratedOutputAutoRepair,
  buildGeneratedOutputRepairPrompt,
  isGeneratedOutputValidAfterRepair,
  isGenerationAutoRepairEnabled,
  repairGeneratedOutputOnce,
} from "../src/lib/templates/output-repair";
import {
  parseTemplateVariables,
} from "../src/lib/templates/utils";
import { validateGeneratedOutput } from "../src/lib/templates/output-validation";
import type { TemplateVariable } from "../src/types/template";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

function optionalField(key: string, label = key): TemplateVariable {
  return {
    key,
    label,
    required: false,
    type: "textarea",
  };
}

function repairResult(text: string) {
  return {
    text,
    model: "gpt-4o-mini",
    inputTokens: 10,
    outputTokens: 12,
  };
}

test("generation auto-repair is disabled by default", () => {
  assert.equal(isGenerationAutoRepairEnabled(undefined), false);
  assert.equal(isGenerationAutoRepairEnabled(""), false);
  assert.equal(isGenerationAutoRepairEnabled("false"), false);
  assert.equal(isGenerationAutoRepairEnabled("TRUE"), false);
  assert.equal(isGenerationAutoRepairEnabled("1"), false);
  assert.equal(isGenerationAutoRepairEnabled("yes"), false);
  assert.equal(isGenerationAutoRepairEnabled("true"), true);
});

test("exact user-prohibited phrase can be repaired once and pass final validation", async () => {
  const variables = [optionalField("claimsRestrictions", "Claims and restrictions")];
  const values = {
    claimsRestrictions: "Avoid streamline.",
  };
  const original = "This planner helps teams streamline planning.";
  const validation = validateGeneratedOutput(original, variables, values);
  let repairCalls = 0;

  assert.equal(validation.ok, false);
  assert.equal(validation.issues[0]?.code, "user_prohibited_phrase");

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async (prompt) => {
      repairCalls += 1;
      assert.match(prompt, /Preserve the same sections, facts, offer, tone, and format/);
      assert.match(prompt, /Do not add new claims/);
      assert.match(prompt, /Do not add URLs/);
      assert.match(prompt, /streamline/);
      assert.match(prompt, /case-insensitive/i);
      return repairResult(
        "This planner helps teams organize weekly planning in one place.",
      );
    },
  });

  assert.equal(repairCalls, 1);
  assert.equal(result.attempted, true);
  assert.equal(result.repaired, true);
  assert.equal(result.content, "This planner helps teams organize weekly planning in one place.");
  assert.equal(result.validation.ok, true);
});

test("smoke fixture: headline Transform is repairable once without second model loop", async () => {
  const variables = [
    optionalField("restrictionsAndDisclosures", "Restrictions and disclosures"),
  ];
  const values = {
    restrictionsAndDisclosures: "Do not use the phrases: transform",
  };
  const original = "Headline: Transform Ideas into Structured Content";
  const validation = validateGeneratedOutput(original, variables, values);
  let repairCalls = 0;

  assert.equal(validation.ok, false);
  assert.ok(
    validation.issues.some(
      (issue) =>
        issue.code === "user_prohibited_phrase" &&
        issue.match.toLowerCase() === "transform",
    ),
  );
  assert.equal(
    assessGeneratedOutputAutoRepair(original, validation).repairable,
    true,
  );

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async (prompt) => {
      repairCalls += 1;
      assert.match(prompt, /transform/i);
      assert.match(prompt, /case-insensitive/i);
      assert.match(prompt, /Do not invent proof, testimonials, metrics, prices, dates/);
      assert.match(prompt, /ORIGINAL GENERATED OUTPUT/);
      return repairResult("Headline: Turn Ideas into Structured Content");
    },
  });

  assert.equal(repairCalls, 1, "repair runs at most once");
  assert.equal(result.attempted, true);
  assert.equal(result.repaired, true);
  assert.doesNotMatch(result.content, /\btransform\b/i);
  assert.match(result.content, /Turn Ideas into Structured Content/i);
  assert.equal(result.validation.ok, true);
  assert.equal(
    isGeneratedOutputValidAfterRepair(result.content, result.validation),
    true,
  );

  // Second validation of the same repaired content stays green (no extra repair needed).
  const revalidated = validateGeneratedOutput(
    result.content,
    variables,
    values,
  );
  assert.equal(revalidated.ok, true);
});

test("smoke fixture: unrepaired Transform headline remains invalid", async () => {
  const variables = [
    optionalField("restrictionsAndDisclosures", "Restrictions and disclosures"),
  ];
  const values = {
    restrictionsAndDisclosures: "Do not use the phrases: transform",
  };
  const original = "Headline: Transform Ideas into Structured Content";
  const validation = validateGeneratedOutput(original, variables, values);

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async () =>
      repairResult("Headline: Transform Ideas into Structured Content"),
  });

  assert.equal(result.attempted, true);
  assert.equal(result.repaired, false);
  assert.equal(result.validation.ok, false);
  assert.match(
    result.validation.issues.find((i) => i.code === "user_prohibited_phrase")
      ?.match ?? "",
    /transform/i,
  );
});

test("Product Description fixture repairs explicit prohibited marketing wording", async () => {
  const schema = readJson<{ variables: unknown }>(
    "src",
    "config",
    "template-forms",
    "product-description-variables.json",
  );
  const variables = parseTemplateVariables(schema.variables);
  const values = {
    claimsRestrictions:
      "Avoid the words: transform, effortlessly, seamless, streamline, guaranteed, boost engagement.",
  };
  const original =
    "Creatornivo helps solo creators streamline repeatable product descriptions.";
  const validation = validateGeneratedOutput(original, variables, values);

  assert.equal(validation.ok, false);
  assert.ok(
    validation.issues.some(
      (issue) =>
        issue.code === "user_prohibited_phrase" &&
        issue.match === "streamline",
    ),
  );

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async () =>
      repairResult(
        "Creatornivo helps solo creators organize repeatable product descriptions.",
      ),
  });

  assert.equal(result.repaired, true);
  assert.doesNotMatch(result.content, /\bstreamline\b/i);
  assert.match(result.content, /\borganize\b/i);
  assert.equal(result.validation.ok, true);
});

test("repair result that adds facts, URLs, prices, dates, or testimonials remains blocked", async () => {
  const variables = [
    optionalField("claimsRestrictions", "Claims and restrictions"),
    optionalField("destinationUrl", "Destination URL"),
    optionalField("priceOfferInfo", "Price or offer details"),
    optionalField("eventDate", "Event date"),
    optionalField("proofPoints", "Proof points"),
  ];
  const values = {
    claimsRestrictions: "Avoid streamline.",
    destinationUrl: "",
    priceOfferInfo: "",
    eventDate: "",
    proofPoints: "",
  };
  const original = "This planner helps teams streamline planning.";
  const validation = validateGeneratedOutput(original, variables, values);

  assert.equal(validation.ok, false);
  assert.deepEqual(
    validation.issues.map((issue) => issue.code),
    ["user_prohibited_phrase"],
  );
  assert.equal(
    assessGeneratedOutputAutoRepair(original, validation).repairable,
    true,
  );

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async () =>
      repairResult(
        [
          "This planner helps teams organize planning.",
          "Testimonial: \"It doubled our output.\"",
          "Visit https://example.com before tomorrow.",
          "Only $19.",
        ].join("\n"),
      ),
  });

  assert.equal(result.attempted, true);
  assert.equal(result.repaired, false);
  assert.ok(
    result.validation.issues.some(
      (issue) => issue.code === "unsupported_commercial_detail",
    ),
  );
  assert.doesNotMatch(result.content, /example\.com/i);
  assert.doesNotMatch(result.content, /Testimonial:/i);
});

test("repair failure leaves the output invalid when the prohibited phrase remains", async () => {
  const variables = [optionalField("wordsToAvoid", "Words to avoid")];
  const values = { wordsToAvoid: 'Avoid "streamline".' };
  const original = "This planner helps teams streamline weekly planning.";
  const validation = validateGeneratedOutput(original, variables, values);

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async () =>
      repairResult("This planner helps teams streamline weekly planning."),
  });

  assert.equal(result.attempted, true);
  assert.equal(result.repaired, false);
  assert.equal(result.validation.ok, false);
});

test("None-only section is repairable and can be removed safely", async () => {
  const variables = [optionalField("notes", "Notes")];
  const values = { notes: "" };
  const original = ["## Notes", "", "None", "", "## Body", "", "Ready."].join("\n");
  const validation = validateGeneratedOutput(original, variables, values);
  const assessment = assessGeneratedOutputAutoRepair(original, validation);

  assert.equal(validation.ok, true);
  assert.equal(assessment.repairable, true);
  assert.equal(assessment.repairableIssues[0]?.code, "empty_sentinel_section");

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async () => repairResult(["## Body", "", "Ready."].join("\n")),
  });

  assert.equal(result.repaired, true);
  assert.equal(result.content, ["## Body", "", "Ready."].join("\n"));
});

test("unrepairable validation issue does not trigger unsafe rewrite", async () => {
  const variables = [optionalField("priceOfferInfo", "Price or offer details")];
  const values = { priceOfferInfo: "" };
  const original = "Launch price: $19.";
  const validation = validateGeneratedOutput(original, variables, values);
  let repairCalls = 0;

  assert.equal(validation.ok, false);
  assert.equal(validation.issues[0]?.code, "unsupported_commercial_detail");

  const result = await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async () => {
      repairCalls += 1;
      return repairResult("Launch price omitted.");
    },
  });

  assert.equal(repairCalls, 0);
  assert.equal(result.attempted, false);
  assert.equal(result.repaired, false);
  assert.equal(result.content, original);
});

test("repair prompt forbids new claims, URLs, proof, prices, dates, testimonials, and credentials", () => {
  const variables = [optionalField("wordsToAvoid", "Words to avoid")];
  const values = { wordsToAvoid: 'Avoid "streamline".' };
  const validation = validateGeneratedOutput(
    "This will streamline planning.",
    variables,
    values,
  );
  const assessment = assessGeneratedOutputAutoRepair(
    "This will streamline planning.",
    validation,
  );
  const prompt = buildGeneratedOutputRepairPrompt({
    content: "This will streamline planning.",
    issues: assessment.repairableIssues,
    variables,
    values,
  });

  assert.match(prompt, /Do not add new claims/);
  assert.match(prompt, /Do not add new facts/);
  assert.match(prompt, /Do not add URLs/);
  assert.match(prompt, /Do not invent proof, testimonials, metrics, prices, dates, deadlines, discounts, credentials/);
  assert.match(prompt, /approvals, or sources/);
  assert.match(prompt, /case-insensitive/i);
  assert.match(prompt, /Output only the repaired final content/);
});

test("enabled route uses buffered final content instead of streaming raw invalid output", () => {
  const route = readProjectFile("src", "app", "api", "ai", "generate", "route.ts");
  const flagCheck = route.indexOf("if (isGenerationAutoRepairEnabled())");
  const bufferedCall = route.indexOf("await createContentText", flagCheck);
  const streamCall = route.indexOf("await createContentStream", flagCheck);
  const finalResponse = route.indexOf("return new Response(finalContent", flagCheck);
  const validationError = route.indexOf('code: "output_validation_failed"', flagCheck);

  assert.ok(flagCheck >= 0);
  assert.ok(bufferedCall > flagCheck);
  assert.ok(streamCall > bufferedCall);
  assert.ok(finalResponse > bufferedCall && finalResponse < streamCall);
  assert.ok(validationError > bufferedCall && validationError < streamCall);
});

test("final repaired output must pass validation and presentation checks", () => {
  const variables = [optionalField("wordsToAvoid", "Words to avoid")];
  const values = { wordsToAvoid: 'Avoid "streamline".' };
  const content = "This planner helps organize weekly planning.";
  const validation = validateGeneratedOutput(content, variables, values);

  assert.equal(isGeneratedOutputValidAfterRepair(content, validation), true);
  assert.equal(
    isGeneratedOutputValidAfterRepair(
      ["## Notes", "", "None"].join("\n"),
      validateGeneratedOutput(["## Notes", "", "None"].join("\n")),
    ),
    false,
  );
});
