import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  fillPromptTemplate,
  isTemplateFieldVisible,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";
import type { TemplateVariable } from "../src/types/template";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

function extractVariables(prompt: string): string[] {
  return [
    ...new Set(
      [...prompt.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

type GitHubReadmeFormSchema = {
  slug: string;
  title: string;
  fieldCount: number;
  requiredKeys: string[];
  groups: Array<{ id: string; title: string; defaultOpen?: boolean }>;
  variables: unknown;
};

type CatalogTemplate = {
  slug: string;
  title: string;
  description: string;
  category: string;
  requiredPlan: string;
  prompt: string;
  variables: Array<{ key: string }>;
};

const expectedKeys = [
  "outputLanguage",
  "projectName",
  "projectSummary",
  "projectType",
  "primaryAudience",
  "projectPurpose",
  "keyFeatures",
  "repositoryUrl",
  "readmeDepth",
  "primaryCallToAction",
  "techStack",
  "systemRequirements",
  "installationMethod",
  "packageManager",
  "installCommands",
  "usageInstructions",
  "configurationDetails",
  "exampleCode",
  "projectStatus",
  "demoUrl",
  "documentationUrl",
  "badgesAndBuildInfo",
  "screenshotsAndMedia",
  "architectureNotes",
  "roadmap",
  "additionalContext",
  "contributionGuidelines",
  "issueTrackerUrl",
  "securityPolicy",
  "licenseInfo",
  "codeOfConductUrl",
  "acknowledgements",
] as const;

const requiredKeys = [
  "projectName",
  "projectSummary",
  "projectType",
  "primaryAudience",
  "projectPurpose",
  "keyFeatures",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "github-readme.txt",
);
const schema = readJson<GitHubReadmeFormSchema>(
  "src",
  "config",
  "template-forms",
  "github-readme-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function getField(key: string): TemplateVariable {
  const field = variables.find((variable) => variable.key === key);
  assert.ok(field, `Missing field ${key}`);
  return field;
}

test("GitHub README prompt is replaced with the approved 32-variable prompt", () => {
  assert.match(prompt, /senior developer-documentation writer/);
  assert.match(prompt, /Project name:\r?\n\{\{projectName\}\}/);
  assert.match(prompt, /Short project description:\r?\n\{\{projectSummary\}\}/);
  assert.match(prompt, /Verified key features:\r?\n\{\{keyFeatures\}\}/);
  assert.match(prompt, /Package manager:\r?\n\{\{packageManager\}\}/);
  assert.match(prompt, /## README\.md/);
  assert.match(prompt, /## Verification Notes/);
  assert.match(
    prompt,
    /Output only the following content package:/,
  );

  assert.doesNotMatch(prompt, /experienced open-source maintainer/);
  assert.doesNotMatch(prompt, /PROJECT IDENTITY/);
  assert.doesNotMatch(prompt, /\{\{repositoryName\}\}/);
  assert.doesNotMatch(prompt, /\{\{repositoryOwner\}\}/);
  assert.doesNotMatch(prompt, /\{\{tagline\}\}/);
  assert.doesNotMatch(prompt, /\{\{projectDescription\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{currentVersion\}\}/);
  assert.doesNotMatch(prompt, /\{\{primaryLanguage\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{features\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("GitHub README form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "github-readme");
  assert.equal(schema.title, "GitHub README");
  assert.equal(schema.fieldCount, 32);
  assert.equal(variables.length, 32);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "repositoryName",
    "repositoryOwner",
    "tagline",
    "projectDescription",
    "audience",
    "currentVersion",
    "primaryLanguage",
    "language",
    "features",
    "sourceDetails",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("GitHub README groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "setup_usage",
      "project_presentation",
      "community_trust",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "setup_usage").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "project_presentation").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "community_trust").length,
    6,
  );

  for (const field of variables) {
    assert.ok(field.label, `${field.key} needs a label`);
    assert.ok(field.placeholder, `${field.key} needs a placeholder`);
    assert.ok(field.hint, `${field.key} needs helper text`);
    assert.ok(field.help?.what, `${field.key} needs help.what`);
    assert.ok(field.help?.why, `${field.key} needs help.why`);
    assert.ok(field.help?.example, `${field.key} needs help.example`);
    assert.ok(field.help?.avoid, `${field.key} needs help.avoid`);
    assert.match(field.type ?? "text", /^(text|textarea|select|number)$/);
  }
});

test("GitHub README options, conditional field, and URL adaptations match the specification", () => {
  assert.deepEqual(getField("projectType").options, [
    "Auto-detect from details",
    "Library or package",
    "Command-line tool",
    "Web application",
    "API or service",
    "Mobile application",
    "Desktop application",
    "Template or boilerplate",
    "Other software project",
  ]);
  assert.deepEqual(getField("primaryAudience").options, [
    "Developers and users",
    "Package consumers",
    "Application users",
    "API integrators",
    "Potential contributors",
    "Technical evaluators",
    "Internal development team",
    "Mixed audience",
  ]);
  assert.deepEqual(getField("installationMethod").options, [
    "Auto",
    "Package manager",
    "Clone and build",
    "Docker or container",
    "Downloaded release",
    "Hosted with no installation",
    "Multiple methods",
  ]);
  assert.deepEqual(getField("packageManager").options, [
    "Auto",
    "npm",
    "pnpm",
    "Yarn",
    "pip",
    "Poetry",
    "Composer",
    "Cargo",
    "NuGet",
    "Other",
  ]);
  assert.deepEqual(getField("readmeDepth").options, [
    "Quick",
    "Standard",
    "Detailed",
    "Auto",
  ]);
  assert.deepEqual(getField("primaryCallToAction").options, [
    "Auto",
    "Install and try the project",
    "View the live demo",
    "Read the documentation",
    "Integrate the package or API",
    "Contribute to the project",
    "Star the repository",
    "No explicit call to action",
  ]);

  for (const key of [
    "repositoryUrl",
    "demoUrl",
    "documentationUrl",
    "issueTrackerUrl",
    "codeOfConductUrl",
  ]) {
    assert.equal(getField(key).type, "text");
    assert.equal(getField(key).format, "url");
  }

  assert.equal(
    isTemplateFieldVisible(getField("packageManager"), {
      installationMethod: "Package manager",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("packageManager"), {
      installationMethod: "Multiple methods",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("packageManager"), {
      installationMethod: "Hosted with no installation",
    }),
    false,
  );
});

test("GitHub README validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    projectName: "TaskFlow CLI",
    projectSummary:
      "A command-line tool that helps small teams organize recurring project tasks from plain-text files.",
    projectType: "Command-line tool",
    primaryAudience: "Developers and users",
    projectPurpose:
      "Use it when a team wants simple local task automation without adopting a hosted project-management system.",
    keyFeatures:
      "Parse task files, group tasks by owner, print due-date summaries, and export a Markdown checklist.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, projectType: "Unknown" }) ??
      "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      repositoryUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      installationMethod: "Package manager",
      packageManager: "Unknown",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      projectName: "x".repeat(121),
    }) ?? "",
    /120 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /TaskFlow CLI/);
  assert.match(rendered, /Command-line tool/);
  assert.match(rendered, /Parse task files/);
});

test("GitHub README catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "github-readme");
  assert.ok(item, "Catalog should include GitHub README");
  assert.equal(item.title, "GitHub README");
  assert.equal(item.category, "app_ux");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /repository-ready README/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 32);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /GITHUB_README_GUIDE_PATH/);
  assert.match(helpButton, /"github-readme": GITHUB_README_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "github-readme",
    "page.tsx",
  );
  assert.match(guidePage, /GitHub README - field guide/);
  assert.match(guidePage, /templateSlug="github-readme"/);
});
