import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_TEMPLATE_FILTER = [
  "product-description",
  "cold-email-outreach",
  "newsletter",
  "email-sequence",
  "pinterest-pin",
  "linkedin-carousel",
];

function parseBoolean(value) {
  return /^true$/i.test(value ?? "");
}

function parseTemplateFilter(value) {
  if (!value?.trim()) return DEFAULT_TEMPLATE_FILTER;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeReport(report) {
  const reportDir = path.join(process.cwd(), "qa-results");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    path.join(reportDir, "real-ui-smoke-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function valueForField(slug, field) {
  const key = String(field.key ?? "");
  if (field.format === "url" || /url|link|website/i.test(key)) {
    return `https://www.creatornivo.com/${slug}/${key}`;
  }
  if (field.type === "number") {
    return String(field.defaultValue ?? Math.min(3, field.max ?? 3));
  }
  if (field.type === "select") {
    if (/plain.*text/i.test(key)) return "Yes";
    return field.defaultValue ?? field.options?.[0] ?? "";
  }
  return `${field.label ?? key} QA smoke value for ${slug}`;
}

function collectOutputIssues(output) {
  const issues = [];
  const checks = [
    { code: "unresolved_placeholder", pattern: /\{\{[a-zA-Z0-9_]+\}\}/ },
    { code: "unsafe_token", pattern: /\bundefined\b|\bnull\b|\[object Object\]/i },
    {
      code: "none_only_section",
      pattern:
        /(^|\n)\s*(?:#{1,6}\s+)?[A-Z][^\n:*]{1,80}:?\s*\r?\n\s*(?:None|N\/A|Not provided|Not specified|No notes)\s*(?=\r?\n{2,}|\r?\n?$)/i,
    },
    {
      code: "placeholder_url",
      pattern:
        /\[(?:link|insert link|add link|url|insert url|click here|here)\]|\]\(#\)|\b(?:URL_HERE|LINK_HERE|YOUR_URL|INSERT_LINK|ADD_LINK)\b|\bexample\.com\b/i,
    },
  ];

  for (const check of checks) {
    const match = output.match(check.pattern)?.[0]?.trim();
    if (match) issues.push({ code: check.code, match });
  }

  return issues;
}

const runRealGenerations = parseBoolean(process.env.QA_RUN_REAL_GENERATIONS);
const maxGenerations = Number.parseInt(process.env.QA_MAX_REAL_GENERATIONS ?? "", 10);
const templates = parseTemplateFilter(process.env.QA_TEMPLATE_FILTER);

if (!runRealGenerations) {
  console.log(
    "Real template generation smoke is disabled. Set QA_RUN_REAL_GENERATIONS=true and QA_MAX_REAL_GENERATIONS to enable it.",
  );
  process.exit(0);
}

if (!Number.isFinite(maxGenerations) || maxGenerations < 1) {
  throw new Error("QA_MAX_REAL_GENERATIONS must be set to a positive number.");
}

if (templates.length > maxGenerations) {
  throw new Error(
    `QA_TEMPLATE_FILTER selects ${templates.length} template(s), exceeding QA_MAX_REAL_GENERATIONS=${maxGenerations}.`,
  );
}

for (const name of ["QA_BASE_URL", "QA_EMAIL", "QA_PASSWORD"]) {
  if (!process.env[name]) {
    throw new Error(`${name} is required when QA_RUN_REAL_GENERATIONS=true.`);
  }
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  throw new Error(
    "Playwright is not installed. Install it only after an explicit dependency decision, then rerun this smoke script.",
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];

try {
  await page.goto(new URL("/login", process.env.QA_BASE_URL).toString(), {
    waitUntil: "networkidle",
  });
  await page.fill('input[type="email"]', process.env.QA_EMAIL);
  await page.fill('input[type="password"]', process.env.QA_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");

  for (const slug of templates) {
    const startedAt = new Date().toISOString();
    const schema = readJson(
      path.join(
        process.cwd(),
        "src",
        "config",
        "template-forms",
        `${slug}-variables.json`,
      ),
    );
    const fields = Array.isArray(schema.variables) ? schema.variables : [];
    const templateUrl = new URL("/generate", process.env.QA_BASE_URL);
    templateUrl.searchParams.set("template", slug);

    await page.goto(templateUrl.toString(), { waitUntil: "networkidle" });

    for (const field of fields) {
      const selector = `#${field.key}`;
      const locator = page.locator(selector);
      if ((await locator.count()) === 0) continue;

      const value = valueForField(slug, field);
      if (!value) continue;

      if (field.type === "select") {
        await locator.selectOption({ label: value }).catch(async () => {
          await locator.selectOption(value).catch(() => undefined);
        });
      } else {
        await locator.fill(value);
      }
    }

    await page.getByRole("button", { name: /^Generate$/i }).click();
    await page.getByText("Result", { exact: true }).waitFor({ timeout: 120000 });
    await page.getByText("Generating...").waitFor({
      state: "detached",
      timeout: 180000,
    }).catch(() => undefined);

    const pageText = await page.locator("body").innerText();
    const resultStart = pageText.indexOf("Result");
    const output = resultStart >= 0 ? pageText.slice(resultStart) : pageText;
    const outputIssues = collectOutputIssues(output);

    results.push({
      template: slug,
      fixture: "full-field",
      startedAt,
      generationStatus: outputIssues.length === 0 ? "completed" : "failed_assertions",
      outputAssertions:
        outputIssues.length === 0 ? "passed" : { failed: outputIssues },
      quotaConsumed: "yes_if_generation_completed",
    });
  }
} finally {
  await browser.close();
}

writeReport({
  generatedAt: new Date().toISOString(),
  baseUrl: process.env.QA_BASE_URL,
  maxGenerations,
  templates,
  results,
});

console.log("Real UI smoke report written to qa-results/real-ui-smoke-report.json.");
