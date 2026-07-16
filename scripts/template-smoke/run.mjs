#!/usr/bin/env node
/**
 * Local Playwright smoke runner for Creatornivo template generation.
 *
 * Modes:
 *   dry-run         Login, open templates, fill fields + restrictions, do NOT generate
 *   batch-smoke     Real generation for selected batch only (requires explicit flag)
 *   quota-exhaustion Optional: burn quota until blocked (requires explicit flag)
 *
 * Env (required for any mode that hits a live app):
 *   E2E_BASE_URL
 *   E2E_TEST_EMAIL
 *   E2E_TEST_PASSWORD
 *
 * Examples:
 *   node scripts/template-smoke/run.mjs --mode dry-run
 *   node scripts/template-smoke/run.mjs --mode batch-smoke --confirm-real-generations
 *   node scripts/template-smoke/run.mjs --mode batch-smoke --templates landing-page-copy,product-description --confirm-real-generations
 *
 * Never prints password. Never runs all 45 templates by default.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_BATCH,
  DEFAULT_BATCH_SIZE,
  DEFAULT_SMOKE_GOAL,
  GENERATION_START_TIMEOUT_MS,
  GENERATION_TIMEOUT_MS,
  MAX_CONSECUTIVE_UNKNOWN_FAILURES,
  MODES,
  NAV_TIMEOUT_MS,
  QUOTA_BLOCK_CHECK_TEMPLATE,
  QUOTA_EXHAUST_BATCH,
  SMOKE_GOALS,
} from "./config.mjs";
import {
  classifyDryRun,
  classifyQuotaBlockAttempt,
  classifyResult,
  detectForbiddenPhrases,
  isQuotaAtLimit,
  isSmokeGoalSuccess,
  parseQuotaFromText,
} from "./detect.mjs";
import { buildFieldPlan } from "./fixtures.mjs";
import { writeSmokeReports } from "./report.mjs";

function parseArgs(argv) {
  const args = {
    mode: "dry-run",
    smokeGoal: DEFAULT_SMOKE_GOAL,
    templates: null,
    batchSize: DEFAULT_BATCH_SIZE,
    confirmReal: false,
    headless: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--mode" && argv[i + 1]) {
      args.mode = argv[++i];
    } else if (
      (a === "--smoke-goal" || a === "--goal") &&
      argv[i + 1]
    ) {
      args.smokeGoal = argv[++i];
    } else if (a === "--templates" && argv[i + 1]) {
      args.templates = argv[++i]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === "--batch-size" && argv[i + 1]) {
      args.batchSize = Number.parseInt(argv[++i], 10);
    } else if (a === "--confirm-real-generations") {
      args.confirmReal = true;
    } else if (a === "--headed") {
      args.headless = false;
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Creatornivo template smoke runner (local only)

Usage:
  node scripts/template-smoke/run.mjs --mode dry-run --smoke-goal normal
  node scripts/template-smoke/run.mjs --mode batch-smoke --smoke-goal normal --confirm-real-generations
  node scripts/template-smoke/run.mjs --mode batch-smoke --smoke-goal safety --templates landing-page-copy --confirm-real-generations
  node scripts/template-smoke/run.mjs --mode quota-exhaustion --smoke-goal normal --confirm-real-generations

Smoke goals (separate concerns):
  normal   Usable generation under everyday constraints (no exact ban list).
           Expected: PASS; quota +1; copy/export/save available.
  safety   Exact user-banned phrase enforcement.
           Acceptable: SAFETY_PASS_MODEL_COMPLIANT | SAFETY_PASS_VALIDATION_BLOCKED
           (VALIDATION_FAIL from validator is a safety PASS, not a template fail.)

Modes:
  dry-run           Fill forms only (no Generate)
  batch-smoke       Real generations for listed templates
  quota-exhaustion  Burn default 15 safe templates once, then one block check
                    (expect QUOTA_BLOCKED / QUOTA_EXHAUSTED — not UNKNOWN_FAIL)

Env:
  E2E_BASE_URL       e.g. https://www.creatornivo.com or http://localhost:3000
  E2E_TEST_EMAIL     dedicated test account email
  E2E_TEST_PASSWORD  dedicated test account password (never logged)

Options:
  --mode <dry-run|batch-smoke|quota-exhaustion>
  --smoke-goal <normal|safety>   default: normal
  --templates slug1,slug2   (batch-smoke default: 5; quota-exhaustion default: 15)
  --batch-size N            max templates (default 5; ignored if --templates set)
  --confirm-real-generations  required for batch-smoke / quota-exhaustion
  --headed                  show browser
`);
}

/**
 * Optionally load E2E_* keys from .env.local / .env if not already set.
 * Does not log values. Files are gitignored.
 */
function loadE2EEnvFromFiles() {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(process.cwd(), name);
    if (!existsSync(filePath)) continue;
    let text = "";
    try {
      text = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!key.startsWith("E2E_")) continue;
      if (process.env[key]) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required.`);
  }
  return String(value).trim();
}

function resolveTemplates(args) {
  if (args.templates?.length) {
    if (args.templates.length > 15 && args.mode !== "quota-exhaustion") {
      throw new Error(
        `Refusing to run ${args.templates.length} templates without explicit smaller batches (cap 15 for non-exhaustion modes).`,
      );
    }
    if (args.mode === "quota-exhaustion" && args.templates.length > 20) {
      throw new Error(
        `quota-exhaustion refuses more than 20 templates (got ${args.templates.length}). Use the default 15 or a smaller list.`,
      );
    }
    return args.templates;
  }
  if (args.mode === "quota-exhaustion") {
    // Exactly the focused 15-template burn list (85→100 on Pro 100/mo).
    return QUOTA_EXHAUST_BATCH.slice();
  }
  const size = Number.isFinite(args.batchSize)
    ? Math.max(1, Math.min(args.batchSize, DEFAULT_BATCH.length))
    : DEFAULT_BATCH_SIZE;
  return DEFAULT_BATCH.slice(0, size);
}

function formatQuota(q) {
  if (!q) return "unknown";
  if (q.used != null && q.limit != null) return `${q.used}/${q.limit}`;
  if (q.remaining != null) return `${q.remaining} left`;
  return "unknown";
}

async function login(page, baseUrl, email, password) {
  await page.goto(new URL("/login", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: NAV_TIMEOUT_MS,
  });
}

/**
 * CSS.escape is browser-only; Node does not define global CSS.
 * Template field keys are simple identifiers (alphanumeric + underscore).
 */
function cssEscapeIdent(value) {
  const raw = String(value ?? "");
  if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(raw)) return raw;
  // Fallback: escape any non-safe CSS identifier character.
  return raw.replace(/[^a-zA-Z0-9_-]/g, (ch) => {
    const hex = ch.codePointAt(0).toString(16);
    return `\\${hex} `;
  });
}

function fieldSelector(key) {
  return `#${cssEscapeIdent(key)}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function dismissOnboardingIfPresent(page) {
  // Best-effort: close tour overlays if they block clicks.
  const skip = page.getByRole("button", { name: /skip|close|got it|dismiss/i });
  if ((await skip.count()) > 0) {
    await skip.first().click({ timeout: 2000 }).catch(() => undefined);
  }
}

/**
 * Expand collapsed form sections so required + restriction fields are in the DOM.
 * Form groups unmount children when closed (`{isOpen && ...}`).
 */
async function expandAllFormSections(page) {
  const expandAll = page.getByRole("button", { name: /^Expand all$/i });
  if ((await expandAll.count()) > 0) {
    await expandAll.first().click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(200);
    return "expand-all";
  }

  // Fallback: open every closed group header (aria-expanded=false).
  let opened = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const closed = page.locator('button[aria-expanded="false"]');
    if ((await closed.count()) === 0) break;
    await closed
      .first()
      .click({ timeout: 1000 })
      .catch(() => undefined);
    opened += 1;
  }
  if (opened > 0) await page.waitForTimeout(200);
  return opened > 0 ? `expanded-${opened}-groups` : "no-expand-control";
}

async function captureFailureArtifacts(page, slug, label) {
  try {
    const dir = path.join(process.cwd(), "smoke-reports", "artifacts");
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = path.join(dir, `${slug}-${label}-${stamp}`);
    const screenshotPath = `${base}.png`;
    const htmlPath = `${base}.html`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    const html = await page.content().catch(() => "");
    if (html) {
      writeFileSync(htmlPath, html);
    }
    const bodyExcerpt = (await page.locator("body").innerText().catch(() => "")).slice(
      0,
      2000,
    );
    return { screenshotPath, htmlPath, bodyExcerpt };
  } catch {
    return { screenshotPath: null, htmlPath: null, bodyExcerpt: "" };
  }
}

/**
 * Locate a form control by stable id/name first, then by label text (+ aliases).
 * Returns { locator, how } or null.
 */
async function locateFieldControl(page, field) {
  const idSel = fieldSelector(field.key);
  const byId = page.locator(idSel);
  if ((await byId.count()) > 0) {
    return { locator: byId.first(), how: idSel, tag: await byId.first().evaluate((el) => el.tagName.toLowerCase()).catch(() => "") };
  }

  const nameSel = `[name="${cssEscapeIdent(field.key)}"]`;
  const byName = page.locator(nameSel);
  if ((await byName.count()) > 0) {
    return {
      locator: byName.first(),
      how: nameSel,
      tag: await byName.first().evaluate((el) => el.tagName.toLowerCase()).catch(() => ""),
    };
  }

  const labelsToTry = [
    field.label,
    ...(Array.isArray(field.labelAliases) ? field.labelAliases : []),
  ].filter(Boolean);

  for (const label of labelsToTry) {
    const labelRe = new RegExp(
      `^\\s*${escapeRegExp(label)}\\s*\\*?\\s*$`,
      "i",
    );
    try {
      const byLabel = page.getByLabel(labelRe);
      if ((await byLabel.count()) > 0) {
        return {
          locator: byLabel.first(),
          how: `label:${label}`,
          tag: await byLabel
            .first()
            .evaluate((el) => el.tagName.toLowerCase())
            .catch(() => ""),
        };
      }
    } catch {
      // getByLabel can throw on bad regex; try next alias.
    }
  }

  // Loose contains match for long labels (punctuation variants).
  for (const label of labelsToTry) {
    if (String(label).length < 4) continue;
    try {
      const loose = page.getByLabel(new RegExp(escapeRegExp(label), "i"));
      if ((await loose.count()) > 0) {
        return {
          locator: loose.first(),
          how: `label~:${label}`,
          tag: await loose
            .first()
            .evaluate((el) => el.tagName.toLowerCase())
            .catch(() => ""),
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Read options from a live <select>, match preferred value/label case-insensitively,
 * else pick first non-empty enabled option (with warning). Never throws for missing option.
 */
async function selectOptionRobust(locator, preferredValue) {
  const options = await locator.locator("option").evaluateAll((els) =>
    els.map((el) => ({
      value: el.value ?? "",
      label: (el.textContent ?? "").trim(),
      disabled: !!el.disabled,
    })),
  );

  const preferred = String(preferredValue ?? "").trim();
  const enabled = options.filter((o) => !o.disabled);
  const nonEmpty = enabled.filter((o) => o.value !== "");

  let chosen = null;
  let warning = null;
  let matchHow = null;

  if (preferred) {
    const prefLower = preferred.toLowerCase();
    chosen =
      enabled.find((o) => o.value.toLowerCase() === prefLower) ||
      enabled.find((o) => o.label.toLowerCase() === prefLower) ||
      enabled.find((o) => o.label.toLowerCase().includes(prefLower)) ||
      enabled.find((o) => prefLower.includes(o.label.toLowerCase()) && o.label.length > 0) ||
      null;
    if (chosen) matchHow = "preferred";
  }

  if (!chosen) {
    chosen = nonEmpty[0] || enabled.find((o) => o.value !== "") || null;
    if (chosen) {
      matchHow = "fallback-first-enabled";
      warning = preferred
        ? `select fallback: preferred="${preferred}" unavailable; used value="${chosen.value}" label="${chosen.label}"`
        : `select fallback: no preferred value; used value="${chosen.value}" label="${chosen.label}"`;
    }
  }

  if (!chosen) {
    return {
      ok: false,
      reason: "no enabled options on select",
      options,
      selectedValue: null,
      selectedLabel: null,
      warning: preferred
        ? `select empty: preferred="${preferred}" and no options`
        : "select empty: no options",
    };
  }

  await locator.selectOption({ value: chosen.value });
  return {
    ok: true,
    selectedValue: chosen.value,
    selectedLabel: chosen.label,
    matchHow,
    warning,
    options,
  };
}

async function fillControl(page, locator, field, tagHint) {
  const tag =
    tagHint ||
    (await locator.evaluate((el) => el.tagName.toLowerCase()).catch(() => ""));
  const typeAttr = await locator.getAttribute("type").catch(() => null);

  // Live element may be select even if schema said text (or vice versa).
  if (tag === "select" || field.type === "select" || field.type === "radio") {
    if (tag !== "select") {
      // Schema said select but DOM is input — fill as text.
      await locator.fill(String(field.value ?? ""));
      return { kind: "text-on-non-select", selectedValue: null, selectedLabel: null, warning: null };
    }
    const result = await selectOptionRobust(locator, field.value);
    if (!result.ok) {
      const err = new Error(result.reason || "select failed");
      err.selectResult = result;
      throw err;
    }
    return {
      kind: "select",
      selectedValue: result.selectedValue,
      selectedLabel: result.selectedLabel,
      warning: result.warning,
      matchHow: result.matchHow,
    };
  }

  if (tag === "textarea" || field.type === "textarea") {
    await locator.fill(String(field.value ?? ""));
    return { kind: "textarea", selectedValue: null, selectedLabel: null, warning: null };
  }

  if (typeAttr === "number" || field.type === "number") {
    await locator.fill(String(field.value ?? ""));
    return { kind: "number", selectedValue: null, selectedLabel: null, warning: null };
  }

  // text / url / default
  try {
    await locator.fill(String(field.value ?? ""));
  } catch {
    await locator.click({ clickCount: 3 });
    await page.keyboard.type(String(field.value ?? ""), { delay: 0 });
  }
  return { kind: "text", selectedValue: null, selectedLabel: null, warning: null };
}

async function fillTemplateFields(page, fieldPlan) {
  const filled = [];
  const skipped = [];
  const warnings = [];
  let lastAction = "start-fill";

  lastAction = "expand-sections";
  const expandHow = await expandAllFormSections(page);
  if (fieldPlan.revealNotes?.length) {
    for (const note of fieldPlan.revealNotes) {
      warnings.push({ key: "_showWhen", message: note });
    }
  }

  for (const field of fieldPlan.fields) {
    lastAction = `locate ${field.key}`;
    // Restriction / late / conditional fields may sit in collapsed sections or
    // only appear after a parent select (showWhen) is set.
    if (field.isRestriction || field.required || field.showWhen) {
      await expandAllFormSections(page);
    }

    let found = await locateFieldControl(page, field);
    if (!found) {
      // One more expand pass then retry (race with hydration / showWhen).
      await expandAllFormSections(page);
      await page.waitForTimeout(200);
      found = await locateFieldControl(page, field);
    }

    if (!found) {
      // Optional fields that stay hidden (e.g. packageManager under installationMethod=Auto)
      // are soft skips — not required for DRY_RUN_PASS.
      const softOptional = !field.required;
      skipped.push({
        key: field.key,
        label: field.label,
        required: !!field.required,
        isRestriction: !!field.isRestriction,
        reason: softOptional
          ? "not found (optional; may be hidden by showWhen)"
          : "not found (id/name/label)",
        softOptional,
      });
      if (softOptional) {
        warnings.push({
          key: field.key,
          message: `optional field skipped (not in DOM / showWhen): ${field.label ?? field.key}`,
        });
      }
      continue;
    }

    const selector = found.how;
    try {
      lastAction =
        found.tag === "select" || field.type === "select"
          ? `selectOption ${selector}`
          : `fill ${selector}`;

      // Scroll into view for stability.
      await found.locator.scrollIntoViewIfNeeded().catch(() => undefined);

      const fillResult = await fillControl(page, found.locator, field, found.tag);
      if (fillResult.warning) {
        warnings.push({ key: field.key, message: fillResult.warning });
      }

      filled.push({
        key: field.key,
        selector,
        label: field.label,
        required: !!field.required,
        isRestriction: !!field.isRestriction,
        kind: fillResult.kind,
        selectedValue: fillResult.selectedValue,
        selectedLabel: fillResult.selectedLabel,
        matchHow: fillResult.matchHow ?? null,
      });

      // After setting a controller select (showWhen parent), re-expand so dependents mount.
      if (
        (field.type === "select" || fillResult.kind === "select") &&
        (field.key === "postType" ||
          field.key === "installationMethod" ||
          field.showWhen == null)
      ) {
        await expandAllFormSections(page);
        await page.waitForTimeout(150);
      }
    } catch (error) {
      // Do not abort the whole template for a single field — record skip.
      // Only navigation/app crashes should surface as UNKNOWN_FAIL higher up.
      const message = error instanceof Error ? error.message : String(error);
      const selectResult = error?.selectResult;
      skipped.push({
        key: field.key,
        label: field.label,
        required: !!field.required,
        isRestriction: !!field.isRestriction,
        selector,
        reason: message,
        selectOptions: selectResult?.options?.slice?.(0, 12) ?? undefined,
      });
      warnings.push({
        key: field.key,
        message: `fill failed at ${lastAction}: ${message}`,
      });
    }
  }

  return { filled, skipped, warnings, lastAction, expandHow };
}

async function readQuota(page) {
  const text = await page.locator("body").innerText();
  return parseQuotaFromText(text);
}

function isGenerateApiRequest(request) {
  try {
    const url = request.url();
    if (request.method() !== "POST") return false;
    return /\/api\/ai\/generate(?:\?|$)/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/**
 * Attach request/response/console/pageerror listeners for one generation attempt.
 * Call dispose() when done.
 */
function createGenerationMonitor(page) {
  const api = {
    requestStarted: false,
    requestFinished: false,
    requestFailed: false,
    failed: false,
    networkError: null,
    failureText: null,
    status: null,
    ok: null,
    bodyExcerpt: null,
    startedAt: null,
    finishedAt: null,
    url: null,
  };
  const consoleErrors = [];
  const pageErrors = [];

  const onRequest = (request) => {
    if (!isGenerateApiRequest(request)) return;
    api.requestStarted = true;
    api.startedAt = Date.now();
    api.url = request.url();
  };

  const onResponse = async (response) => {
    try {
      if (!isGenerateApiRequest(response.request())) return;
      api.status = response.status();
      api.ok = response.ok();
      // For non-OK responses, capture a short body excerpt (JSON errors).
      if (!response.ok()) {
        api.failed = true;
        try {
          const text = await response.text();
          api.bodyExcerpt = String(text ?? "").slice(0, 500);
        } catch {
          api.bodyExcerpt = "(could not read error body)";
        }
      }
    } catch {
      // ignore listener errors
    }
  };

  const onRequestFinished = (request) => {
    if (!isGenerateApiRequest(request)) return;
    api.requestFinished = true;
    api.finishedAt = Date.now();
  };

  const onRequestFailed = (request) => {
    if (!isGenerateApiRequest(request)) return;
    api.requestFailed = true;
    api.failed = true;
    api.networkError = true;
    api.failureText = request.failure()?.errorText ?? "requestfailed";
    api.finishedAt = Date.now();
  };

  const onConsole = (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(String(msg.text()).slice(0, 400));
    }
  };

  const onPageError = (err) => {
    pageErrors.push(err instanceof Error ? err.message : String(err));
  };

  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("requestfinished", onRequestFinished);
  page.on("requestfailed", onRequestFailed);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  return {
    api,
    consoleErrors,
    pageErrors,
    dispose() {
      page.off("request", onRequest);
      page.off("response", onResponse);
      page.off("requestfinished", onRequestFinished);
      page.off("requestfailed", onRequestFailed);
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

async function isGeneratingVisible(page) {
  // Primary signal: Generate button label while streaming.
  const genBtn = page.getByRole("button", { name: /Generating/i });
  if ((await genBtn.count()) > 0 && (await genBtn.first().isVisible().catch(() => false))) {
    return true;
  }
  // Badge in Result card.
  const badge = page.getByText("Generating...", { exact: true });
  if ((await badge.count()) > 0 && (await badge.first().isVisible().catch(() => false))) {
    return true;
  }
  return false;
}

async function readVisibleAlerts(page) {
  const texts = [];
  const alert = page.locator('[role="alert"]');
  const n = await alert.count();
  for (let i = 0; i < Math.min(n, 5); i += 1) {
    const t = (await alert.nth(i).innerText().catch(() => "")).trim();
    if (t) texts.push(t);
  }
  return texts;
}

/**
 * Scrape Result card body (markdown), not only the header/actions row.
 *
 * Bug fixed: previous XPath used nearest ancestor with "border" or "rounded",
 * which matched CardHeader (border-b) and never included MarkdownContent.
 *
 * Strategy:
 * 1. Prefer ancestor with "rounded" (outer Card) → full card text.
 * 2. Prefer content region under the card (overflow / max-h / after header).
 * 3. Fallbacks: evaluate DOM, then body slice from "Result".
 *
 * Returns { errorText, outputText, bodyText, headerText, alerts, scrapeHow }.
 */
async function readGenerationOutput(page) {
  const alerts = await readVisibleAlerts(page);
  const errorText = alerts.join("\n").trim();

  const resultTitle = page.getByRole("heading", { name: /^Result$/i }).first();
  let outputText = "";
  let bodyText = "";
  let headerText = "";
  let scrapeHow = "none";

  if ((await resultTitle.count()) === 0) {
    return { errorText, outputText, bodyText, headerText, alerts, scrapeHow };
  }

  // Outer Card uses rounded-*; CardHeader uses border-b but not rounded-*.
  // Prefer rounded ancestor so we do not stop at the header.
  const card = resultTitle.locator(
    'xpath=ancestor::div[contains(@class,"rounded")][1]',
  );

  if ((await card.count()) > 0) {
    outputText = (await card.first().innerText().catch(() => "")).trim();
    scrapeHow = "card-rounded-ancestor";

    // Header-ish region: first block containing the Result heading.
    const headerLoc = card
      .locator("xpath=.//div[contains(@class,'border-b') or contains(@class,'border-border')][1]")
      .first();
    if ((await headerLoc.count()) > 0) {
      headerText = (await headerLoc.innerText().catch(() => "")).trim();
    }

    // Body region: scrollable content area (CardContent has max-h + overflow-y-auto).
    const bodyCandidates = [
      card.locator('[class*="overflow-y-auto"]').first(),
      card.locator('[class*="max-h-"]').first(),
      card.locator("xpath=.//div[contains(@class,'px-6') and contains(@class,'py-6')][1]"),
    ];

    for (const cand of bodyCandidates) {
      if ((await cand.count()) === 0) continue;
      const text = (await cand.innerText().catch(() => "")).trim();
      if (text.length > bodyText.length) {
        bodyText = text;
        scrapeHow = `${scrapeHow}+content-region`;
      }
    }

    // If body region empty, derive body by subtracting header chrome from full card.
    if (!bodyText && outputText) {
      if (headerText && outputText.startsWith(headerText)) {
        bodyText = outputText.slice(headerText.length).trim();
        scrapeHow = `${scrapeHow}+card-minus-header`;
      } else {
        // Drop first lines that look like chrome only.
        const lines = outputText.split(/\r?\n/);
        const bodyLines = [];
        let pastChrome = false;
        for (const line of lines) {
          const t = line.trim();
          if (!pastChrome) {
            if (
              !t ||
              /^Result$/i.test(t) ||
              /^Generating\.\.\.$/i.test(t) ||
              /^gpt-[\w.-]+$/i.test(t) ||
              /^(Copy|Save to library|Saving\.\.\.|Export Markdown|Export Plain text|Export)$/i.test(
                t,
              )
            ) {
              continue;
            }
            pastChrome = true;
          }
          bodyLines.push(line);
        }
        bodyText = bodyLines.join("\n").trim();
        scrapeHow = `${scrapeHow}+card-strip-chrome-lines`;
      }
    }
  }

  // DOM evaluate fallback when Playwright locators miss structure.
  if (!bodyText || bodyText.length < 20) {
    const evaluated = await page
      .evaluate(() => {
        const headings = Array.from(document.querySelectorAll("h3"));
        const h = headings.find((el) => (el.textContent || "").trim() === "Result");
        if (!h) return null;
        let el = h.parentElement;
        let cardEl = null;
        while (el) {
          const cls = el.className && String(el.className);
          if (cls && cls.includes("rounded")) {
            cardEl = el;
            break;
          }
          el = el.parentElement;
        }
        if (!cardEl) return null;
        const full = (cardEl.innerText || "").trim();
        // Prefer last large text block that is not the header actions row.
        const overflow = cardEl.querySelector(
          '[class*="overflow-y-auto"], [class*="max-h-"]',
        );
        const region = overflow
          ? (overflow.innerText || "").trim()
          : "";
        return { full, region };
      })
      .catch(() => null);

    if (evaluated?.region && evaluated.region.length > bodyText.length) {
      bodyText = evaluated.region;
      if (!outputText) outputText = evaluated.full || bodyText;
      scrapeHow = `${scrapeHow}|evaluate-region`;
    } else if (evaluated?.full && evaluated.full.length > outputText.length) {
      outputText = evaluated.full;
      if (!bodyText) bodyText = evaluated.full;
      scrapeHow = `${scrapeHow}|evaluate-full`;
    }
  }

  if (!outputText) {
    const body = await page.locator("body").innerText().catch(() => "");
    const idx = body.indexOf("Result");
    outputText = idx >= 0 ? body.slice(idx, idx + 8000) : "";
    if (!bodyText) bodyText = outputText;
    scrapeHow = `${scrapeHow}|body-slice`;
  }

  // Classification prefers bodyText when present; keep full card in outputText.
  if (!bodyText) bodyText = outputText;

  return { errorText, outputText, bodyText, headerText, alerts, scrapeHow };
}

/**
 * Wait for generation to finish after Generate was clicked.
 * Completion: request finished (or failed) AND "Generating..." UI gone,
 * or a visible error alert after the request ended.
 * Does NOT treat the "Result" heading alone as completion (it appears while streaming).
 */
async function waitForGenerationComplete(page, monitor, {
  startTimeoutMs = GENERATION_START_TIMEOUT_MS,
  timeoutMs = GENERATION_TIMEOUT_MS,
  onAction,
} = {}) {
  const setAction = (a) => {
    if (typeof onAction === "function") onAction(a);
  };

  const startedAt = Date.now();
  let sawGeneratingUi = false;
  let generateClickedConfirmed = false;

  setAction("wait-generation-start");
  // Confirm generation actually started (UI and/or network).
  while (Date.now() - startedAt < startTimeoutMs) {
    if (monitor.api.requestStarted) {
      generateClickedConfirmed = true;
      setAction("api-request-started");
    }
    if (await isGeneratingVisible(page)) {
      sawGeneratingUi = true;
      generateClickedConfirmed = true;
      setAction("generating-ui-visible");
    }
    if (generateClickedConfirmed) break;
    // Error alert without spinner (immediate API rejection)
    const alerts = await readVisibleAlerts(page);
    if (alerts.length > 0 && monitor.api.requestFinished) {
      setAction("early-error-after-request");
      return {
        timedOut: false,
        stillGenerating: false,
        generateClickedConfirmed: true,
        sawGeneratingUi,
        elapsedMs: Date.now() - startedAt,
      };
    }
    await page.waitForTimeout(200);
  }

  if (!generateClickedConfirmed) {
    setAction("generation-start-not-detected");
    return {
      timedOut: true,
      stillGenerating: await isGeneratingVisible(page),
      generateClickedConfirmed: false,
      sawGeneratingUi,
      elapsedMs: Date.now() - startedAt,
      startFailed: true,
    };
  }

  setAction("wait-generation-finish");
  const finishDeadline = Date.now() + timeoutMs;
  while (Date.now() < finishDeadline) {
    const stillGen = await isGeneratingVisible(page);
    const apiDone =
      monitor.api.requestFinished ||
      monitor.api.requestFailed ||
      (monitor.api.requestStarted && monitor.api.failed && monitor.api.status != null);
    const alerts = await readVisibleAlerts(page);

    if (monitor.api.requestFinished) setAction("api-request-finished");
    if (monitor.api.requestFailed) setAction("api-request-failed");

    // HTTP error body consumed — UI should show alert; stop once generating ends or alert shows.
    if (apiDone && !stillGen) {
      setAction("generation-complete");
      // Brief settle for final React paint / validation message
      await page.waitForTimeout(800);
      return {
        timedOut: false,
        stillGenerating: false,
        generateClickedConfirmed: true,
        sawGeneratingUi,
        elapsedMs: Date.now() - startedAt,
      };
    }

    // Failed HTTP with alert even if spinner briefly stuck
    if (
      monitor.api.failed &&
      typeof monitor.api.status === "number" &&
      monitor.api.status >= 400 &&
      alerts.length > 0 &&
      !stillGen
    ) {
      setAction("api-error-with-alert");
      return {
        timedOut: false,
        stillGenerating: false,
        generateClickedConfirmed: true,
        sawGeneratingUi,
        elapsedMs: Date.now() - startedAt,
      };
    }

    if (stillGen) setAction("still-generating");
    await page.waitForTimeout(400);
  }

  setAction("generation-timeout");
  const stillGenerating = await isGeneratingVisible(page);
  return {
    timedOut: true,
    stillGenerating,
    generateClickedConfirmed: true,
    sawGeneratingUi,
    elapsedMs: Date.now() - startedAt,
  };
}

async function captureGenerationDiagnostics(page, slug, label, extra = {}) {
  const artifacts = await captureFailureArtifacts(page, slug, label);
  const stillGenerating = await isGeneratingVisible(page);
  const generateBtn = page.getByRole("button", { name: /^(Generate|Generating)/i });
  let generateButtonEnabled = null;
  let generateButtonLabel = null;
  if ((await generateBtn.count()) > 0) {
    generateButtonEnabled = await generateBtn.first().isEnabled().catch(() => null);
    generateButtonLabel = (
      await generateBtn.first().innerText().catch(() => "")
    ).trim();
  }
  const alerts = await readVisibleAlerts(page);
  const { outputText } = await readGenerationOutput(page);

  return {
    ...artifacts,
    url: page.url(),
    stillGenerating,
    generateButtonEnabled,
    generateButtonLabel,
    alerts,
    outputText,
    ...extra,
  };
}

async function readActionAvailability(page) {
  const copy = page.getByRole("button", { name: /^Copy$/i });
  const save = page.getByRole("button", { name: /^Save/i });
  const exportBtn = page.getByRole("button", { name: /export|\.md|\.txt/i });

  return {
    copyAvailable: (await copy.count()) > 0 && (await copy.first().isEnabled().catch(() => false)),
    saveAvailable: (await save.count()) > 0 && (await save.first().isEnabled().catch(() => false)),
    exportAvailable:
      (await exportBtn.count()) > 0 &&
      (await exportBtn.first().isEnabled().catch(() => false)),
  };
}

async function readSelectedTemplateTitle(page) {
  // Workspace shows the selected template as an h2 next to the category badge.
  const headings = page.locator("h2");
  const count = await headings.count();
  for (let i = 0; i < count; i += 1) {
    const text = (await headings.nth(i).innerText().catch(() => "")).trim();
    if (!text || /^templates$/i.test(text)) continue;
    if (text.length < 120) return text;
  }
  return null;
}

/**
 * URL ?template= is not always applied before fill (SPA race / locked fallback to
 * first accessible template). Always select via the picker and verify the h2 title.
 */
async function ensureTemplateSelected(page, slug, expectedTitle) {
  const warnings = [];
  const titleRe = new RegExp(
    `^\\s*${escapeRegExp(expectedTitle)}\\s*$`,
    "i",
  );

  // Wait for picker to mount.
  await page
    .getByRole("heading", { name: /^Templates$/i })
    .waitFor({ timeout: NAV_TIMEOUT_MS })
    .catch(() => undefined);

  let current = await readSelectedTemplateTitle(page);
  if (current && titleRe.test(current)) {
    // Confirm URL when possible.
    const url = page.url();
    if (!url.includes(`template=${slug}`)) {
      warnings.push(
        `title matched "${current}" but URL missing template=${slug}`,
      );
    }
    return { ok: true, title: current, how: "already-selected", warnings };
  }

  // Search + click the template card in the picker.
  const search = page.getByLabel(/search templates/i);
  if ((await search.count()) > 0) {
    await search.first().fill("");
    await search.first().fill(expectedTitle);
    await page.waitForTimeout(300);
  } else {
    warnings.push("template search input not found");
  }

  // Cards include title + description; match by title substring, prefer unique search hit.
  const pickerButtons = page.locator(
    '[data-onboarding="template-picker"] button[type="button"]',
  );
  const titleMatch = pickerButtons.filter({
    hasText: new RegExp(escapeRegExp(expectedTitle), "i"),
  });
  let clicked = false;
  if ((await titleMatch.count()) > 0) {
    const beforeUrl = page.url();
    await titleMatch.first().click({ timeout: 5000 });
    // Locked Pro cards navigate to /pricing instead of selecting.
    await page.waitForTimeout(400);
    if (/\/pricing/i.test(page.url()) && !/\/pricing/i.test(beforeUrl)) {
      await page.goto(beforeUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
      return {
        ok: false,
        title: await readSelectedTemplateTitle(page),
        how: "template-locked",
        warnings: [
          ...warnings,
          `Template "${expectedTitle}" appears locked (click navigated to pricing).`,
        ],
      };
    }
    clicked = true;
  }

  if (!clicked) {
    // Last resort: search by slug words.
    if ((await search.count()) > 0) {
      await search.first().fill(slug.replace(/-/g, " "));
      await page.waitForTimeout(300);
      const bySlug = pickerButtons.filter({
        hasText: new RegExp(escapeRegExp(expectedTitle), "i"),
      });
      if ((await bySlug.count()) > 0) {
        await bySlug.first().click({ timeout: 5000 }).catch(() => undefined);
        clicked = true;
      }
    }
  }

  if (!clicked) {
    current = await readSelectedTemplateTitle(page);
    return {
      ok: false,
      title: current,
      how: "not-found-in-picker",
      warnings: [
        ...warnings,
        `Could not find template card for title="${expectedTitle}" slug="${slug}". Active title="${current ?? "none"}".`,
      ],
    };
  }

  // Wait until workspace heading reflects the selection.
  try {
    await page
      .locator("h2")
      .filter({ hasText: titleRe })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    current = await readSelectedTemplateTitle(page);
    return {
      ok: false,
      title: current,
      how: "click-no-title-match",
      warnings: [
        ...warnings,
        `Clicked template but heading is "${current ?? "none"}", expected "${expectedTitle}".`,
      ],
    };
  }

  current = await readSelectedTemplateTitle(page);
  // Clear search so later runs see full list.
  if ((await search.count()) > 0) {
    await search.first().fill("").catch(() => undefined);
  }

  return {
    ok: true,
    title: current ?? expectedTitle,
    how: "picker-click",
    warnings,
  };
}

async function runTemplate(page, baseUrl, slug, mode, smokeGoal = DEFAULT_SMOKE_GOAL) {
  const fieldPlan = buildFieldPlan(slug, { smokeGoal });
  // Schema + URL always use catalog slug; keep requested slug for report/log labels.
  const canonicalSlug = fieldPlan.slug;
  const requestedSlug = fieldPlan.requestedSlug ?? slug;
  if (fieldPlan.aliased) {
    console.log(
      `[template-smoke] slug alias: ${requestedSlug} → ${canonicalSlug}`,
    );
  }

  const templateUrl = new URL("/generate", baseUrl);
  templateUrl.searchParams.set("template", canonicalSlug);

  await page.goto(templateUrl.toString(), {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });
  await dismissOnboardingIfPresent(page);

  // Wait for generate workspace shell
  await page
    .getByRole("heading", { name: /^Templates$/i })
    .waitFor({ timeout: NAV_TIMEOUT_MS })
    .catch(() => undefined);
  await page
    .getByRole("button", { name: /^Generate$/i })
    .waitFor({ timeout: NAV_TIMEOUT_MS })
    .catch(() => undefined);

  const selection = await ensureTemplateSelected(
    page,
    canonicalSlug,
    fieldPlan.title,
  );

  // Wait for form chrome / first planned control when possible.
  await expandAllFormSections(page);
  if (fieldPlan.fields[0] && selection.ok) {
    const firstKey = fieldPlan.fields[0].key;
    await page
      .locator(fieldSelector(firstKey))
      .waitFor({ state: "attached", timeout: 15_000 })
      .catch(() => undefined);
  }

  const selectedTemplateTitle =
    selection.title ?? (await readSelectedTemplateTitle(page)) ?? fieldPlan.title;

  let fillMeta = {
    filled: [],
    skipped: [],
    warnings: [],
    lastAction: "pre-fill",
    expandHow: null,
  };

  try {
    // Still attempt fill for diagnostics even if selection failed.
    fillMeta = await fillTemplateFields(page, fieldPlan);
    fillMeta.warnings = [
      ...(selection.warnings ?? []).map((message) => ({
        key: "_selection",
        message,
      })),
      ...(fillMeta.warnings ?? []),
    ];

    // Safety goal: re-apply ban-list restriction last (often in collapsed group).
    // Normal goal: leave restriction empty (not planned).
    if (fieldPlan.requireRestriction && fieldPlan.restrictionKey) {
      await expandAllFormSections(page);
      fillMeta.lastAction = `restriction-fill ${fieldPlan.restrictionKey}`;
      const restrictionField = {
        key: fieldPlan.restrictionKey,
        label:
          fieldPlan.fields.find((f) => f.key === fieldPlan.restrictionKey)?.label ??
          fieldPlan.restrictionKey,
        type: "textarea",
        value: fieldPlan.restrictionText,
        isRestriction: true,
        required: false,
      };
      const found = await locateFieldControl(page, restrictionField);
      if (found) {
        await found.locator.scrollIntoViewIfNeeded().catch(() => undefined);
        await found.locator.fill(fieldPlan.restrictionText);
        // Deduplicate prior fill entry for same key.
        fillMeta.filled = fillMeta.filled.filter(
          (f) => f.key !== fieldPlan.restrictionKey,
        );
        fillMeta.skipped = fillMeta.skipped.filter(
          (s) => s.key !== fieldPlan.restrictionKey,
        );
        fillMeta.filled.push({
          key: fieldPlan.restrictionKey,
          selector: found.how,
          label: restrictionField.label,
          required: false,
          isRestriction: true,
          reapplied: true,
          kind: "textarea",
          selectedValue: null,
          selectedLabel: null,
        });
      } else if (
        !fillMeta.filled.some((f) => f.key === fieldPlan.restrictionKey)
      ) {
        fillMeta.skipped.push({
          key: fieldPlan.restrictionKey,
          label: restrictionField.label,
          required: false,
          isRestriction: true,
          reason: "restriction field not found after expand",
        });
      }
    }
  } catch (error) {
    // Unexpected exception only (navigation/app crash during fill orchestration).
    const artifacts = await captureFailureArtifacts(
      page,
      canonicalSlug,
      "fill-fail",
    );
    const message = error instanceof Error ? error.message : String(error);
    return {
      template: requestedSlug,
      requestedTemplate: requestedSlug,
      canonicalTemplate: canonicalSlug,
      canonicalSlug,
      aliasApplied: !!fieldPlan.aliased,
      aliased: !!fieldPlan.aliased,
      title: fieldPlan.title,
      selectedTemplateTitle,
      restrictionField: fieldPlan.restrictionKey,
      status: "UNKNOWN_FAIL",
      quotaBefore: null,
      quotaAfter: null,
      quotaBeforeLabel: "unknown",
      quotaAfterLabel: "n/a",
      forbiddenPhraseDetected: false,
      matchedPhrase: null,
      warnPhrases: [],
      copyAvailable: false,
      exportAvailable: false,
      saveAvailable: false,
      errorMessage: message,
      outputExcerpt: artifacts.bodyExcerpt ?? "",
      notes: `Unexpected fill orchestration failure. lastAction=${error?.action ?? fillMeta.lastAction}; screenshot=${artifacts.screenshotPath ?? "none"}`,
      lastAction: error?.action ?? fillMeta.lastAction,
      failedSelector: error?.selector ?? null,
      screenshotPath: artifacts.screenshotPath,
      fieldsFilled: fillMeta.filled.length,
      requiredFieldsFilled: 0,
      fieldsSkipped: fillMeta.skipped.length,
      skippedKeys: fillMeta.skipped.map((s) => s.key),
      generateButtonEnabled: false,
      warnings: fillMeta.warnings ?? [],
    };
  }

  const quotaBefore = await readQuota(page);
  const filledKeys = fillMeta.filled.map((f) => f.key);
  const filledKeySet = new Set(filledKeys);
  const requiredFieldsFilled = fieldPlan.requiredKeys.filter((k) =>
    filledKeySet.has(k),
  ).length;
  const restrictionFilled =
    !fieldPlan.restrictionKey || filledKeySet.has(fieldPlan.restrictionKey);

  const generateBtn = page.getByRole("button", { name: /^Generate$/i });
  const generateButtonFound = (await generateBtn.count()) > 0;
  const generateButtonEnabled = generateButtonFound
    ? await generateBtn.first().isEnabled().catch(() => false)
    : false;

  const row = {
    template: requestedSlug,
    requestedTemplate: requestedSlug,
    canonicalTemplate: canonicalSlug,
    canonicalSlug,
    aliasApplied: !!fieldPlan.aliased,
    aliased: !!fieldPlan.aliased,
    title: fieldPlan.title,
    selectedTemplateTitle,
    smokeGoal,
    restrictionField: fieldPlan.restrictionKey,
    status: "UNKNOWN_FAIL",
    quotaBefore,
    quotaAfter: null,
    quotaBeforeLabel: formatQuota(quotaBefore),
    quotaAfterLabel: "n/a",
    forbiddenPhraseDetected: false,
    matchedPhrase: null,
    warnPhrases: [],
    copyAvailable: false,
    exportAvailable: false,
    saveAvailable: false,
    errorMessage: "",
    outputExcerpt: "",
    notes: fieldPlan.aliased
      ? `Slug alias applied: ${requestedSlug} → ${canonicalSlug}`
      : "",
    lastAction: fillMeta.lastAction,
    fieldsFilled: fillMeta.filled.length,
    requiredFieldsFilled,
    requiredKeys: fieldPlan.requiredKeys,
    fieldsSkipped: fillMeta.skipped.length,
    skippedKeys: fillMeta.skipped.map((s) => s.key),
    skippedDetails: fillMeta.skipped,
    generateButtonEnabled,
    generateButtonFound,
    warnings: fillMeta.warnings ?? [],
    filledDetails: fillMeta.filled.map((f) => ({
      key: f.key,
      kind: f.kind,
      selectedValue: f.selectedValue,
      selectedLabel: f.selectedLabel,
      isRestriction: f.isRestriction,
    })),
  };

  if (mode === "dry-run") {
    const titleOk =
      !!selectedTemplateTitle &&
      new RegExp(`^\\s*${escapeRegExp(fieldPlan.title)}\\s*$`, "i").test(
        selectedTemplateTitle,
      );

    // Wrong template selected → never PASS (avoids LinkedIn false positives).
    const classified = classifyDryRun({
      requiredKeys: fieldPlan.requiredKeys,
      filledKeys: titleOk ? filledKeys : [],
      restrictionKey: fieldPlan.restrictionKey,
      restrictionFilled: titleOk && restrictionFilled,
      requireRestriction: fieldPlan.requireRestriction,
      generateButtonEnabled: titleOk && generateButtonEnabled,
      generateButtonFound,
      skipped: fillMeta.skipped,
      warnings: fillMeta.warnings ?? [],
      smokeGoal,
    });

    // Override notes when selection failed.
    if (!titleOk || !selection.ok) {
      row.status = "DRY_RUN_INCOMPLETE";
      row.missingRequired = fieldPlan.requiredKeys.slice();
      row.notes = [
        "Generate not clicked (dry-run mode).",
        `smokeGoal=${smokeGoal}.`,
        `Wrong or unconfirmed template selection: expected="${fieldPlan.title}" active="${selectedTemplateTitle ?? "none"}" how=${selection.how}.`,
        `restrictionField=${fieldPlan.restrictionKey ?? "none"}`,
        `fieldsFilled=${fillMeta.filled.length}`,
        `requiredFieldsFilled=${requiredFieldsFilled}/${fieldPlan.requiredKeys.length}`,
        `fieldsSkipped=${fillMeta.skipped.length}`,
        fillMeta.skipped.length
          ? `skippedKeys=${fillMeta.skipped.map((s) => s.key).join(",")}`
          : null,
        `generateButtonEnabled=${generateButtonEnabled}`,
        `quota=${formatQuota(quotaBefore)}`,
        (fillMeta.warnings ?? []).length
          ? `warnings=${(fillMeta.warnings ?? []).map((w) => w.message).join(" | ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      row.status = classified.status;
      row.missingRequired = classified.missingRequired;
      row.notes = [
        classified.notes,
        `selectedTemplateTitle=${selectedTemplateTitle}`,
        `selectionHow=${selection.how}`,
        `restrictionField=${fieldPlan.restrictionKey ?? "none"}`,
        `restrictionFilled=${restrictionFilled}`,
        `fieldsFilled=${fillMeta.filled.length}`,
        `requiredFieldsFilled=${requiredFieldsFilled}/${fieldPlan.requiredKeys.length}`,
        `fieldsSkipped=${fillMeta.skipped.length}`,
        fillMeta.skipped.length
          ? `skippedKeys=${fillMeta.skipped.map((s) => s.key).join(",")}`
          : null,
        `generateButtonEnabled=${generateButtonEnabled}`,
        `quota=${formatQuota(quotaBefore)}`,
        (fillMeta.warnings ?? []).length
          ? `warnings=${(fillMeta.warnings ?? []).map((w) => w.message).join(" | ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" ");
    }
    row.selectionHow = selection.how;
    row.smokeGoalSuccess = isSmokeGoalSuccess(row.status, smokeGoal);
    row.quotaAfter = quotaBefore;
    row.quotaAfterLabel = formatQuota(quotaBefore);
    return row;
  }

  // Real generation
  if (!generateButtonFound) {
    row.status = "UI_FAIL";
    row.notes = "Generate button not found.";
    row.lastAction = "generate-button-missing";
    return row;
  }

  if (!generateButtonEnabled) {
    const bodySnippet = (await page.locator("body").innerText().catch(() => "")).slice(
      0,
      500,
    );
    if (isQuotaAtLimit(quotaBefore) || /quota|no generations? left|limit reached/i.test(bodySnippet)) {
      const block = classifyQuotaBlockAttempt({
        generateButtonEnabled: false,
        generateClicked: false,
        errorText: bodySnippet,
        quotaBefore,
        quotaAfter: quotaBefore,
        copyAvailable: false,
        saveAvailable: false,
        exportAvailable: false,
      });
      row.status = block.status;
      row.smokeGoalSuccess = block.smokeGoalSuccess;
      row.notes = block.notes;
      row.errorMessage = bodySnippet;
      row.lastAction = "generate-button-disabled-quota";
      row.quotaAfter = quotaBefore;
      row.quotaAfterLabel = formatQuota(quotaBefore);
      return row;
    }
    row.status = "UI_FAIL";
    row.notes = "Generate button disabled (quota, email verification, or form validity).";
    row.errorMessage = bodySnippet;
    row.lastAction = "generate-button-disabled";
    return row;
  }

  const monitor = createGenerationMonitor(page);
  let waitResult = {
    timedOut: false,
    stillGenerating: false,
    generateClickedConfirmed: false,
    sawGeneratingUi: false,
    elapsedMs: 0,
  };

  try {
    row.lastAction = "before-generate-click";
    // Ensure the enabled Generate control is the click target (not a stale "Generating..." node).
    const clickTarget = page.getByRole("button", { name: /^Generate$/i }).first();
    await clickTarget.scrollIntoViewIfNeeded().catch(() => undefined);
    row.lastAction = "click-generate";
    await clickTarget.click({ timeout: 10_000 });
    row.lastAction = "after-generate-click";
    row.generateClicked = true;

    waitResult = await waitForGenerationComplete(page, monitor, {
      startTimeoutMs: GENERATION_START_TIMEOUT_MS,
      timeoutMs: GENERATION_TIMEOUT_MS,
      onAction: (action) => {
        row.lastAction = action;
      },
    });
  } catch (error) {
    // Unexpected automation exception only.
    monitor.dispose();
    const message = error instanceof Error ? error.message : String(error);
    const diag = await captureGenerationDiagnostics(
      page,
      canonicalSlug,
      "gen-exception",
      {
      api: { ...monitor.api },
      consoleErrors: monitor.consoleErrors.slice(0, 10),
      pageErrors: monitor.pageErrors.slice(0, 10),
      },
    );
    row.status = "UNKNOWN_FAIL";
    row.errorMessage = message;
    row.notes = [
      "Unexpected exception during Generate click/wait.",
      `lastAction=${row.lastAction}`,
      `url=${diag.url}`,
      `screenshot=${diag.screenshotPath ?? "none"}`,
    ].join(" ");
    row.outputExcerpt = (diag.outputText || diag.bodyExcerpt || "").slice(0, 1500);
    row.screenshotPath = diag.screenshotPath;
    row.api = { ...monitor.api };
    row.consoleErrors = monitor.consoleErrors.slice(0, 10);
    row.pageErrors = monitor.pageErrors.slice(0, 10);
    row.quotaAfter = await readQuota(page);
    row.quotaAfterLabel = formatQuota(row.quotaAfter);
    return row;
  }

  // Always read post-generation state (including timeout diagnostics).
  const {
    errorText,
    outputText,
    bodyText,
    headerText,
    alerts,
    scrapeHow,
  } = await readGenerationOutput(page);
  const stillGenerating = waitResult.stillGenerating || (await isGeneratingVisible(page));
  // Detect forbidden phrases on body (preferred) + full scrape + errors.
  const forbidden = detectForbiddenPhrases(
    `${bodyText || ""}\n${outputText || ""}\n${errorText || ""}`,
  );
  const quotaAfter = await readQuota(page);
  const actions = await readActionAvailability(page);

  const genBtnAfter = page.getByRole("button", { name: /^(Generate|Generating)/i });
  let generateButtonEnabledAfter = null;
  let generateButtonLabelAfter = null;
  if ((await genBtnAfter.count()) > 0) {
    generateButtonEnabledAfter = await genBtnAfter
      .first()
      .isEnabled()
      .catch(() => null);
    generateButtonLabelAfter = (
      await genBtnAfter.first().innerText().catch(() => "")
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  let timeoutDiag = null;
  if (waitResult.timedOut || stillGenerating) {
    timeoutDiag = await captureGenerationDiagnostics(
      page,
      canonicalSlug,
      "gen-timeout",
      {
      api: { ...monitor.api },
      consoleErrors: monitor.consoleErrors.slice(0, 10),
      pageErrors: monitor.pageErrors.slice(0, 10),
      },
    );
    row.screenshotPath = timeoutDiag.screenshotPath;
  }

  const classified = classifyResult({
    dryRun: false,
    errorText,
    outputText,
    bodyText,
    generationTimedOut: waitResult.timedOut,
    stillGenerating,
    generateClicked: waitResult.generateClickedConfirmed || row.generateClicked === true,
    forbidden,
    quotaBefore,
    quotaAfter,
    api: monitor.api,
    consoleErrors: monitor.consoleErrors,
    // Secondary signals only — never sole reason for PASS.
    copyAvailable: actions.copyAvailable,
    saveAvailable: actions.saveAvailable,
    exportAvailable: actions.exportAvailable,
    smokeGoal,
  });

  monitor.dispose();

  row.status = classified.status;
  row.smokeGoalSuccess =
    classified.smokeGoalSuccess != null
      ? classified.smokeGoalSuccess
      : isSmokeGoalSuccess(classified.status, smokeGoal);
  row.notes = [
    classified.notes,
    `smokeGoal=${smokeGoal}`,
    `smokeGoalSuccess=${row.smokeGoalSuccess}`,
    `lastAction=${row.lastAction}`,
    `elapsedMs=${waitResult.elapsedMs}`,
    `generateClickedConfirmed=${waitResult.generateClickedConfirmed}`,
    `sawGeneratingUi=${waitResult.sawGeneratingUi}`,
    `stillGenerating=${stillGenerating}`,
    `apiStarted=${monitor.api.requestStarted}`,
    `apiFinished=${monitor.api.requestFinished}`,
    `apiFailed=${monitor.api.failed}`,
    `apiStatus=${monitor.api.status ?? "n/a"}`,
    `scrapeHow=${scrapeHow ?? "n/a"}`,
    `bodyChars=${classified.contentOnlyLength ?? "n/a"}`,
    `generateButtonAfter=${generateButtonLabelAfter ?? "n/a"} enabled=${generateButtonEnabledAfter}`,
    timeoutDiag
      ? `url=${timeoutDiag.url}; screenshot=${timeoutDiag.screenshotPath ?? "none"}; alerts=${(timeoutDiag.alerts ?? []).join(" | ") || "none"}`
      : null,
    monitor.consoleErrors.length
      ? `consoleErrors=${monitor.consoleErrors.slice(0, 3).join(" || ")}`
      : null,
    monitor.pageErrors.length
      ? `pageErrors=${monitor.pageErrors.slice(0, 3).join(" || ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
  row.errorMessage = errorText || (alerts ?? []).join("\n");
  // Prefer body in excerpt so reports show markdown, not header chrome alone.
  row.outputExcerpt = (bodyText || outputText || errorText || "").slice(0, 1500);
  row.bodyTextExcerpt = (bodyText || "").slice(0, 1500);
  row.headerTextExcerpt = (headerText || "").slice(0, 500);
  row.scrapeHow = scrapeHow;
  row.contentOnlyLength = classified.contentOnlyLength ?? null;
  row.quotaAfter = quotaAfter;
  row.quotaAfterLabel = formatQuota(quotaAfter);
  // Safety goal: hard list is a real ban signal.
  // Normal goal: anti-hype hits are style warnings only (never hard fail).
  if (smokeGoal === "safety") {
    row.forbiddenPhraseDetected = forbidden.hardDetected;
    row.matchedPhrase = forbidden.hardMatches.join(", ") || null;
    row.warnPhrases = forbidden.warnMatches;
  } else {
    row.forbiddenPhraseDetected = false;
    row.matchedPhrase = null;
    row.warnPhrases = [
      ...forbidden.hardMatches.map((p) => `style:${p}`),
      ...forbidden.warnMatches,
    ];
  }
  row.copyAvailable = actions.copyAvailable;
  row.exportAvailable = actions.exportAvailable;
  row.saveAvailable = actions.saveAvailable;
  row.api = {
    requestStarted: monitor.api.requestStarted,
    requestFinished: monitor.api.requestFinished,
    requestFailed: monitor.api.requestFailed,
    failed: monitor.api.failed,
    status: monitor.api.status,
    networkError: monitor.api.networkError,
    failureText: monitor.api.failureText,
    bodyExcerpt: monitor.api.bodyExcerpt,
    startedAt: monitor.api.startedAt,
    finishedAt: monitor.api.finishedAt,
  };
  row.consoleErrors = monitor.consoleErrors.slice(0, 10);
  row.pageErrors = monitor.pageErrors.slice(0, 10);
  row.stillGenerating = stillGenerating;
  row.generateButtonEnabledAfter = generateButtonEnabledAfter;
  row.generateButtonLabelAfter = generateButtonLabelAfter;
  row.generationElapsedMs = waitResult.elapsedMs;

  if (quotaAfter?.remaining === 0 || /quota|limit reached/i.test(errorText)) {
    row.notes = `${row.notes} [quota-exhausted-signal]`.trim();
  }

  return row;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!MODES.includes(args.mode)) {
    throw new Error(`Unknown mode "${args.mode}". Use: ${MODES.join(", ")}`);
  }

  if (!SMOKE_GOALS.includes(args.smokeGoal)) {
    throw new Error(
      `Unknown smoke goal "${args.smokeGoal}". Use: ${SMOKE_GOALS.join(", ")}`,
    );
  }

  loadE2EEnvFromFiles();

  const baseUrl = requireEnv("E2E_BASE_URL");
  const email = requireEnv("E2E_TEST_EMAIL");
  const password = requireEnv("E2E_TEST_PASSWORD");
  // password intentionally never logged

  const templates = resolveTemplates(args);

  if (
    (args.mode === "batch-smoke" || args.mode === "quota-exhaustion") &&
    !args.confirmReal
  ) {
    throw new Error(
      `Mode "${args.mode}" spends real OpenAI quota. Re-run with --confirm-real-generations after explicit approval.`,
    );
  }

  if (args.mode === "quota-exhaustion" && !args.confirmReal) {
    throw new Error("quota-exhaustion requires --confirm-real-generations");
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "Playwright is not installed. From repo root run: npm i -D playwright && npx playwright install chromium",
    );
  }

  console.log(`[template-smoke] mode=${args.mode}`);
  console.log(`[template-smoke] smokeGoal=${args.smokeGoal}`);
  console.log(`[template-smoke] baseUrl=${baseUrl}`);
  console.log(`[template-smoke] email=${email}`);
  console.log(`[template-smoke] templates=${templates.join(",")}`);
  console.log("[template-smoke] password=(hidden)");

  const browser = await chromium.launch({ headless: args.headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  const results = [];
  let stoppedEarly = false;
  let stopReason = "";
  let consecutiveUnknown = 0;

  try {
    try {
      await login(page, baseUrl, email, password);
      console.log("[template-smoke] login: ok");
    } catch (error) {
      stoppedEarly = true;
      stopReason = `login failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[template-smoke] ${stopReason}`);
      results.push({
        template: "(login)",
        status: "UI_FAIL",
        quotaBeforeLabel: "n/a",
        quotaAfterLabel: "n/a",
        forbiddenPhraseDetected: false,
        matchedPhrase: null,
        copyAvailable: false,
        exportAvailable: false,
        saveAvailable: false,
        errorMessage: stopReason,
        outputExcerpt: "",
        notes: stopReason,
        restrictionField: null,
      });
      throw error;
    }

    // quota-exhaustion: run the burn list once (default 15), then one block check.
    // Never cycle 120× — that was unsafe and hard to reason about.
    const loopTemplates = templates;

    for (const slug of loopTemplates) {
      console.log(`[template-smoke] >>> ${slug}`);
      let row;
      try {
        row = await runTemplate(
          page,
          baseUrl,
          slug,
          // Real generation path for both batch-smoke and quota-exhaustion burn steps.
          args.mode === "quota-exhaustion" ? "batch-smoke" : args.mode,
          args.smokeGoal,
        );
      } catch (error) {
        row = {
          template: slug,
          status: "UNKNOWN_FAIL",
          quotaBeforeLabel: "unknown",
          quotaAfterLabel: "unknown",
          forbiddenPhraseDetected: false,
          matchedPhrase: null,
          copyAvailable: false,
          exportAvailable: false,
          saveAvailable: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          outputExcerpt: "",
          notes: "Exception during template run.",
          restrictionField: null,
        };
      }

      results.push(row);
      console.log(
        `[template-smoke] ${slug}: ${row.status} goal=${row.smokeGoal ?? args.smokeGoal} success=${row.smokeGoalSuccess ?? "n/a"} quota ${row.quotaBeforeLabel}→${row.quotaAfterLabel} filled=${row.fieldsFilled ?? "?"} req=${row.requiredFieldsFilled ?? "?"}/${row.requiredKeys?.length ?? "?"} skipped=${row.fieldsSkipped ?? "?"} genEnabled=${row.generateButtonEnabled ?? "?"}`,
      );

      // GENERATION_TIMEOUT is not a prompt failure and does not count as UNKNOWN_FAIL.
      // Only unexpected automation exceptions accumulate toward early stop.
      if (row.status === "UNKNOWN_FAIL") {
        consecutiveUnknown += 1;
      } else {
        consecutiveUnknown = 0;
      }

      if (consecutiveUnknown >= MAX_CONSECUTIVE_UNKNOWN_FAILURES) {
        stoppedEarly = true;
        stopReason = `${MAX_CONSECUTIVE_UNKNOWN_FAILURES} consecutive UNKNOWN_FAIL`;
        break;
      }

      if (
        args.mode !== "quota-exhaustion" &&
        (isQuotaAtLimit(row.quotaAfter) ||
          /quota-exhausted-signal/i.test(row.notes ?? ""))
      ) {
        stoppedEarly = true;
        stopReason = "quota exhausted";
        break;
      }

      // During exhaustion burn: stop burning early once at limit so we can run block check.
      if (args.mode === "quota-exhaustion" && isQuotaAtLimit(row.quotaAfter)) {
        console.log(
          `[template-smoke] burn list reached quota limit after ${slug}; proceeding to block check`,
        );
        break;
      }
    }

    if (args.mode === "quota-exhaustion" && !stoppedEarly) {
      const last = results[results.length - 1];
      const atLimit = isQuotaAtLimit(last?.quotaAfter);
      const checkSlug =
        templates.includes(QUOTA_BLOCK_CHECK_TEMPLATE)
          ? QUOTA_BLOCK_CHECK_TEMPLATE
          : templates[0] ?? QUOTA_BLOCK_CHECK_TEMPLATE;

      if (!atLimit) {
        stoppedEarly = true;
        stopReason =
          "quota-exhaustion burn finished but quota not at limit (some generations may not have counted). Skipping block check.";
        console.warn(`[template-smoke] ${stopReason}`);
      } else {
        console.log(
          `[template-smoke] >>> ${checkSlug}#quota-block-check (expect QUOTA_BLOCKED)`,
        );
        let checkRow;
        try {
          checkRow = await runTemplate(
            page,
            baseUrl,
            checkSlug,
            "batch-smoke",
            args.smokeGoal,
          );
        } catch (error) {
          checkRow = {
            template: checkSlug,
            status: "UNKNOWN_FAIL",
            quotaBeforeLabel: "unknown",
            quotaAfterLabel: "unknown",
            forbiddenPhraseDetected: false,
            matchedPhrase: null,
            copyAvailable: false,
            exportAvailable: false,
            saveAvailable: false,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            outputExcerpt: "",
            notes: "Exception during quota block check.",
            restrictionField: null,
          };
        }

        // Re-classify ambiguous outcomes into explicit quota statuses.
        if (
          checkRow.status !== "QUOTA_BLOCKED" &&
          checkRow.status !== "QUOTA_EXHAUSTED" &&
          checkRow.status !== "QUOTA_LEAK"
        ) {
          const originalStatus = checkRow.status;
          const reclass = classifyQuotaBlockAttempt({
            generateButtonEnabled: checkRow.generateButtonEnabled,
            generateClicked: !!checkRow.generateClicked,
            errorText: checkRow.errorMessage || checkRow.notes || "",
            outputText: checkRow.outputExcerpt || "",
            bodyText: checkRow.outputExcerpt || "",
            api: checkRow.api ?? null,
            quotaBefore: checkRow.quotaBefore,
            quotaAfter: checkRow.quotaAfter,
            copyAvailable: !!checkRow.copyAvailable,
            saveAvailable: !!checkRow.saveAvailable,
            exportAvailable: !!checkRow.exportAvailable,
          });
          if (
            reclass.status === "QUOTA_BLOCKED" ||
            reclass.status === "QUOTA_EXHAUSTED" ||
            reclass.status === "QUOTA_LEAK"
          ) {
            checkRow.status = reclass.status;
            checkRow.smokeGoalSuccess = reclass.smokeGoalSuccess;
            checkRow.notes = `${reclass.notes} | originalStatus=${originalStatus}`;
          }
        }

        checkRow.quotaExhaustionCheck = true;
        checkRow.template = `${checkRow.requestedTemplate ?? checkRow.template ?? checkSlug}#quota-block-check`;
        checkRow.requestedTemplate =
          checkRow.requestedTemplate ?? checkSlug;
        checkRow.notes = [
          checkRow.notes,
          "quota-exhaustion post-check: expect no UserUsage increment beyond limit and no exportable success content.",
        ]
          .filter(Boolean)
          .join(" ");

        results.push(checkRow);
        console.log(
          `[template-smoke] ${checkRow.template}: ${checkRow.status} success=${checkRow.smokeGoalSuccess ?? "n/a"} quota ${checkRow.quotaBeforeLabel}→${checkRow.quotaAfterLabel}`,
        );

        stoppedEarly = true;
        stopReason =
          checkRow.status === "QUOTA_BLOCKED" ||
          checkRow.status === "QUOTA_EXHAUSTED"
            ? `quota block confirmed (${checkRow.status})`
            : `quota block check finished with status=${checkRow.status}`;
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    smokeGoal: args.smokeGoal,
    baseUrl,
    email,
    templates,
    stoppedEarly,
    stopReason,
    results,
  };

  mkdirSync(path.join(process.cwd(), "smoke-reports"), { recursive: true });
  const paths = writeSmokeReports(report);
  console.log(`[template-smoke] wrote ${paths.mdPath}`);
  console.log(`[template-smoke] wrote ${paths.jsonPath}`);

  if (stoppedEarly && /login failed/i.test(stopReason)) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("[template-smoke] fatal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
