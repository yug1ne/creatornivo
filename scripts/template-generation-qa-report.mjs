import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "prisma", "templates-catalog.json");
const reportDir = path.join(root, "qa-results");

const restrictionFieldPattern =
  /(?:avoid|doNotUse|restriction|prohibited|forbidden|compliance|privacy|sensitive|regulated|claimsAndRestrictions|claimsRestrictions|contentToAvoid|wordsToAvoid|additionalRequirements)/i;
const strongContractPattern =
  /(?:HARD USER RESTRICTIONS|DO NOT USE|FINAL (?:QUALITY )?CHECK|TRUTHFULNESS|SAFEGUARDS|Do not|Never|Restrictions|Prohibited)/i;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function riskFor(template, restrictionFields) {
  if (restrictionFields.length === 0) return "Clean";
  if (!strongContractPattern.test(template.prompt)) return "High";
  if (restrictionFields.length >= 6) return "Medium";
  return "Low";
}

function recommendedAction(risk) {
  if (risk === "Clean") return "No restriction-specific action needed.";
  if (risk === "Low") return "Covered by prompt contract; keep in smoke rotation.";
  if (risk === "Medium") return "Review manually during category smoke tests.";
  return "Strengthen prompt contract before relying on generated output.";
}

const catalog = readJson(catalogPath);
const rows = catalog.map((template) => {
  const schema = readJson(
    path.join(
      root,
      "src",
      "config",
      "template-forms",
      `${template.slug}-variables.json`,
    ),
  );
  const variables = Array.isArray(schema.variables) ? schema.variables : [];
  const restrictionFields = variables
    .filter((field) =>
      restrictionFieldPattern.test(`${field.key ?? ""} ${field.label ?? ""}`),
    )
    .map((field) => field.key);
  const risk = riskFor(template, restrictionFields);

  return {
    slug: template.slug,
    category: template.category,
    restrictionFields,
    risk,
    recommendedAction: recommendedAction(risk),
  };
});

mkdirSync(reportDir, { recursive: true });
writeFileSync(
  path.join(reportDir, "static-template-audit.json"),
  `${JSON.stringify(rows, null, 2)}\n`,
);
writeFileSync(
  path.join(reportDir, "static-template-audit.md"),
  [
    "# Static template QA audit",
    "",
    "| Template | Category | Restriction fields | Risk | Recommended action |",
    "| --- | --- | ---: | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.slug} | ${row.category} | ${row.restrictionFields.length} | ${row.risk} | ${row.recommendedAction} |`,
    ),
    "",
  ].join("\n"),
);

const counts = rows.reduce(
  (acc, row) => {
    acc[row.risk] = (acc[row.risk] ?? 0) + 1;
    return acc;
  },
  {},
);

console.log("Static template QA report written to qa-results/.");
console.log(JSON.stringify(counts, null, 2));
