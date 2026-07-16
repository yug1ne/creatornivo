import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_SMOKE_GOAL,
  RESTRICTION_FIELD_PRIORITY,
  restrictionTextForGoal,
  shouldFillRestrictionField,
} from "./config.mjs";

/**
 * Extra label aliases for live form matching (label text may vary slightly).
 * Keys are field keys; values are alternate labels tried after the schema label.
 */
export const FIELD_LABEL_ALIASES = {
  campaignTitle: [
    "Offer or event title",
    "Offer / event title",
    "Event title",
    "Campaign title",
    "Post title",
    "Offer title",
  ],
  timingDetails: [
    "Dates, times, and time zone",
    "Dates, times and time zone",
    "Date and time",
    "Event date/time",
    "Timing details",
    "Schedule",
    "Dates and times",
  ],
  packageManager: ["Package manager", "Package Manager"],
};

/**
 * Title-derived / historical / shortened slug mistakes → canonical catalog slug.
 * Schema files and `?template=` always use the canonical slug.
 *
 * Examples:
 * - "Short-Form Video Script" → slug `short-form-video` (not short-form-video-script)
 * - "In-App UX Copy" / shortened `ux-copy` → slug `in-app-ux-copy`
 */
export const SLUG_ALIASES = {
  "short-form-video-script": "short-form-video",
  "ux-copy": "in-app-ux-copy",
};

/**
 * @param {string} slug
 * @returns {{ requestedSlug: string, canonicalSlug: string, aliased: boolean }}
 */
export function resolveTemplateSlug(slug) {
  const requestedSlug = String(slug ?? "").trim();
  const canonicalSlug = SLUG_ALIASES[requestedSlug] ?? requestedSlug;
  return {
    requestedSlug,
    canonicalSlug,
    aliased: Boolean(requestedSlug) && requestedSlug !== canonicalSlug,
  };
}

/**
 * Load local form schema JSON for a template slug (or known alias).
 * @param {string} slug
 */
export function readTemplateSchema(slug) {
  const { requestedSlug, canonicalSlug, aliased } = resolveTemplateSlug(slug);
  const filePath = path.join(
    process.cwd(),
    "src",
    "config",
    "template-forms",
    `${canonicalSlug}-variables.json`,
  );
  if (!existsSync(filePath)) {
    const aliasHint = aliased
      ? ` (requested alias "${requestedSlug}" → "${canonicalSlug}")`
      : "";
    throw new Error(`Missing form schema: ${filePath}${aliasHint}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function pickRestrictionFieldKey(fields) {
  const keys = new Set(fields.map((f) => f.key));
  for (const preferred of RESTRICTION_FIELD_PRIORITY) {
    if (keys.has(preferred)) return preferred;
  }
  // Fallback: first field whose key/label looks restriction-like.
  const fuzzy = fields.find((f) =>
    /restrict|avoid|prohibited|claims|compliance|additional/i.test(
      `${f.key} ${f.label ?? ""}`,
    ),
  );
  return fuzzy?.key ?? null;
}

function optionStrings(field) {
  const opts = field.options ?? [];
  return opts.map((o) =>
    typeof o === "string" ? o : String(o?.value ?? o?.label ?? ""),
  ).filter(Boolean);
}

/**
 * Pick a select value that should exist on the form.
 * Prefer defaultValue, then schema options, then empty (runtime fallback fills).
 */
function valueForSelect(field, _slug) {
  const opts = optionStrings(field);
  if (field.defaultValue) {
    const def = String(field.defaultValue);
    if (opts.length === 0) return def;
    const hit = opts.find((o) => o.toLowerCase() === def.toLowerCase());
    if (hit) return hit;
  }
  if (opts.length > 0) return opts[0];
  return field.defaultValue ? String(field.defaultValue) : "";
}

/** Safe realistic defaults for required fields (and useful optionals). */
export function valueForField(slug, field, restrictionKey, restrictionText) {
  const key = String(field.key ?? "");

  if (restrictionKey && key === restrictionKey) {
    return restrictionText ?? "";
  }

  if (field.type === "number") {
    const n = Number(field.defaultValue);
    if (Number.isFinite(n)) return String(n);
    return String(Math.min(3, field.max ?? 3));
  }

  // Select/radio before URL heuristics — keys like externalLinkPolicy match /link/ otherwise.
  if (field.type === "select" || field.type === "radio") {
    return valueForSelect(field, slug);
  }

  if (
    field.format === "url" ||
    /(?:^|[A-Z]|_)(url|website|destinationUrl|ctaDestination|internalLinks)(?:$|[A-Z_])/i.test(
      key,
    ) ||
    /^(websiteUrl|destinationUrl|ctaDestination|ctaUrl|linkUrl)$/i.test(key)
  ) {
    return `https://www.creatornivo.com/smoke/${slug}`;
  }

  // Template-aware short defaults for common commercial fields.
  // Prefer realistic briefs over "… smoke value for …" placeholders (models may refuse meta-test strings).
  const presets = {
    brandOrCompany: "Creatornivo",
    brandName: "Creatornivo",
    brandOrPublisher: "Creatornivo",
    productName: "Weekly Content Planner",
    offerName: "Weekly Content Planner",
    appName: "Creatornivo Planner",
    productOrOffer: "A weekly content planner for solo creators",
    campaignGoal: "Lead generation",
    primaryGoal: "Get sign-ups",
    targetAudience: "Solo creators who plan content weekly",
    coreProblem: "They rebuild prompts from scratch each week.",
    mainPromise: "A calmer way to start from reusable content structures.",
    coreValueProposition:
      "Reuse structured prompts instead of starting from a blank page.",
    productFacts:
      "Digital planner with weekly outline, hook starters, and note sections. Free PDF download.",
    appSummary:
      "A content planning app for solo creators who want reusable weekly outlines.",
    coreFeatures: "Weekly outline, hook starters, CTA notes, export to markdown.",
    keyBenefits: "Keep ideas in one place and draft posts with less blank-page friction.",
    targetCustomer: "Solo creators and small marketing freelancers",
    productCategory: "Digital planners and templates",
    marketplace: "Amazon.com US",
    caseStudySubject: "Creatornivo weekly planner pilot",
    clientName: "Northstar Studio",
    providerName: "Creatornivo",
    webinarTopic: "Plan a week of content without a blank page",
    businessName: "Creatornivo Studio",
    outputLanguage: "English",
    coreProductFacts:
      "Weekly content planner PDF. Sections for hooks, outlines, and CTAs. Digital download.",
    topBenefits:
      "Faster weekly planning, reusable structure, less blank-page friction for solo creators.",
    // Blog article required brief — concrete, non-meta (avoids model refusals on "smoke value" topics).
    articleTopic:
      "How solo creators plan a week of content without starting from a blank page",
    readerOutcome:
      "The reader can apply a simple weekly outline process using reusable sections for hooks, posts, and CTAs.",
    keyPoints:
      "1) Why blank-page planning drains time. 2) A simple weekly outline structure. 3) How to reuse hooks and CTAs. 4) A short checklist for publishing day.",
    sourceNotes:
      "General planning practices only. No studies, statistics, or named case results are supplied — do not invent them.",
    // Google Business Profile — offer/event conditional fields
    keyMessage:
      "Creatornivo Studio is hosting a free weekly content planning workshop for local solo creators. Seats are limited to confirmed RSVPs.",
    campaignTitle: "Free Weekly Content Planning Workshop",
    timingDetails: "22–24 July 2026, 10:00–12:00, Europe/Kyiv",
    offerValue: "Free 2-hour workshop; RSVP required",
    // Short-Form Video Script (canonical slug: short-form-video)
    videoTopic:
      "One practical tip for planning a week of content without starting from a blank page",
    essentialFacts:
      "Weekly outline sections for hooks, post drafts, and CTAs. Free PDF planner for solo creators. No invented stats or guarantees.",
    // In-App UX Copy (canonical slug: in-app-ux-copy; alias: ux-copy)
    productOrFeature: "Creatornivo weekly content planner",
    interfaceContext:
      "Empty state on the library page when a Free user has no saved generations yet.",
    workflowGoal:
      "Understand that nothing is saved yet and start a first generation from a template",
    targetUsers: "Solo creators on Free plan who just registered",
    uxElements:
      "Empty-state heading, short supporting body, primary CTA button, secondary text link",
    keyFacts:
      "Free plan includes 5 generations per UTC day. Save to library is available after generate. No invented limits or features.",
  };

  if (presets[key]) return presets[key];

  // Template-specific select overrides (must beat defaultValue when we need showWhen reveal).
  if (slug === "google-business-profile-post") {
    if (key === "postType") return "Offer";
    if (key === "primaryGoal") return "Promote an offer";
  }

  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== "") {
    return String(field.defaultValue);
  }

  if (field.required) {
    // Avoid meta strings like "Label smoke value for slug" which can trigger model refusals.
    return `Practical details for ${field.label ?? key} related to Creatornivo weekly content planning.`;
  }

  // Leave most optionals blank unless needed for form validity.
  return "";
}

/** Evaluate a single showWhen clause against planned values (mirrors app clauseMatches). */
function clauseMatches(clause, values) {
  if (!clause || typeof clause !== "object") return true;
  const current = values[clause.key] ?? "";

  if (clause.equals !== undefined) {
    const list = Array.isArray(clause.equals) ? clause.equals : [clause.equals];
    if (!list.map(String).includes(String(current))) return false;
  }
  if (clause.notEquals !== undefined) {
    const list = Array.isArray(clause.notEquals)
      ? clause.notEquals
      : [clause.notEquals];
    if (list.map(String).includes(String(current))) return false;
  }
  if (clause.contains !== undefined) {
    const list = Array.isArray(clause.contains)
      ? clause.contains
      : [clause.contains];
    if (!list.some((item) => String(current).includes(String(item)))) return false;
  }
  return true;
}

/** Whether a field is visible given planned values (mirrors isTemplateFieldVisible). */
export function isFieldVisibleInPlan(field, values) {
  const when = field?.showWhen;
  if (!when) return true;
  if (when.anyOf && Array.isArray(when.anyOf)) {
    return when.anyOf.some((c) => clauseMatches(c, values));
  }
  if (when.allOf && Array.isArray(when.allOf)) {
    return when.allOf.every((c) => clauseMatches(c, values));
  }
  return clauseMatches(when, values);
}

/**
 * If a required field is hidden by showWhen, set controlling field(s) so it becomes visible.
 * e.g. campaignTitle showWhen postType in [Offer, Event] → set postType to Offer.
 */
function revealRequiredConditionalFields(fields, plannedValues, requiredKeys) {
  const notes = [];
  let changed = true;
  let guard = 0;

  while (changed && guard < 12) {
    changed = false;
    guard += 1;
    for (const key of requiredKeys) {
      const field = fields.find((f) => f.key === key);
      if (!field) continue;
      if (isFieldVisibleInPlan(field, plannedValues)) continue;

      const when = field.showWhen;
      if (!when) continue;

      const clauses = when.anyOf
        ? when.anyOf
        : when.allOf
          ? when.allOf
          : [when];

      for (const clause of clauses) {
        if (!clause?.key || clause.equals === undefined) continue;
        const list = Array.isArray(clause.equals)
          ? clause.equals
          : [clause.equals];
        if (list.length === 0) continue;
        const next = String(list[0]);
        if (plannedValues[clause.key] !== next) {
          plannedValues[clause.key] = next;
          notes.push(
            `reveal ${key}: set ${clause.key}="${next}" (showWhen)`,
          );
          changed = true;
        }
      }
    }
  }

  return notes;
}

function dependencyDepth(field, fieldsByKey, seen = new Set()) {
  const when = field?.showWhen;
  if (!when) return 0;
  const clause = when.anyOf?.[0] || when.allOf?.[0] || when;
  const depKey = clause?.key;
  if (!depKey || seen.has(field.key)) return 0;
  seen.add(field.key);
  const dep = fieldsByKey.get(depKey);
  return 1 + dependencyDepth(dep, fieldsByKey, seen);
}

/**
 * @param {string} slug
 * @param {{ smokeGoal?: 'normal' | 'safety' }} [options]
 */
export function buildFieldPlan(slug, options = {}) {
  const smokeGoal = options.smokeGoal ?? DEFAULT_SMOKE_GOAL;
  const fillRestriction = shouldFillRestrictionField(smokeGoal);
  const restrictionText = restrictionTextForGoal(smokeGoal);

  const { requestedSlug, canonicalSlug, aliased } = resolveTemplateSlug(slug);
  const schema = readTemplateSchema(canonicalSlug);
  const fields = Array.isArray(schema.variables) ? schema.variables : [];
  const fieldsByKey = new Map(fields.map((f) => [f.key, f]));
  const restrictionKey = pickRestrictionFieldKey(fields);
  const schemaRequiredKeys = Array.isArray(schema.requiredKeys)
    ? schema.requiredKeys.slice()
    : fields.filter((f) => f.required).map((f) => f.key);

  // Seed planned values from defaults / presets so showWhen can be evaluated.
  const plannedValues = {};
  for (const field of fields) {
    const isRestriction = field.key === restrictionKey;
    if (isRestriction && !fillRestriction) {
      plannedValues[field.key] = "";
      continue;
    }
    if (
      field.required ||
      (field.type === "select" && field.defaultValue) ||
      (isRestriction && fillRestriction)
    ) {
      plannedValues[field.key] = valueForField(
        canonicalSlug,
        field,
        fillRestriction ? restrictionKey : null,
        restrictionText,
      );
    }
  }

  // Template-level overrides for conditional required fields (GBP Offer flow).
  if (canonicalSlug === "google-business-profile-post") {
    plannedValues.postType = "Offer";
    plannedValues.primaryGoal = "Promote an offer";
    plannedValues.campaignTitle =
      plannedValues.campaignTitle || "Free Weekly Content Planning Workshop";
    plannedValues.timingDetails =
      plannedValues.timingDetails || "22–24 July 2026, 10:00–12:00, Europe/Kyiv";
  }

  const revealNotes = revealRequiredConditionalFields(
    fields,
    plannedValues,
    schemaRequiredKeys,
  );

  // Only count required keys that are visible under planned values (conditional form truth).
  const requiredKeys = schemaRequiredKeys.filter((key) => {
    const field = fieldsByKey.get(key);
    if (!field) return false;
    return isFieldVisibleInPlan(field, plannedValues);
  });

  const plan = [];
  const pushField = (field, { forceRequired = false } = {}) => {
    if (plan.some((p) => p.key === field.key)) return;
    const isRestriction = field.key === restrictionKey;
    if (isRestriction && !fillRestriction) return;
    if (!isFieldVisibleInPlan(field, plannedValues)) return;

    const value =
      plannedValues[field.key] ??
      valueForField(
        canonicalSlug,
        field,
        fillRestriction ? restrictionKey : null,
        restrictionText,
      );
    if (
      !value &&
      !isRestriction &&
      field.type !== "select" &&
      field.type !== "radio"
    ) {
      return;
    }

    plannedValues[field.key] = isRestriction ? restrictionText : value;
    plan.push({
      key: field.key,
      type: field.type ?? "text",
      label: field.label ?? field.key,
      labelAliases: FIELD_LABEL_ALIASES[field.key] ?? [],
      value: isRestriction ? restrictionText : value,
      isRestriction,
      required:
        forceRequired ||
        !!field.required ||
        requiredKeys.includes(field.key),
      options: optionStrings(field),
      group: field.group ?? null,
      showWhen: field.showWhen ?? null,
    });
  };

  for (const field of fields) {
    if (!isFieldVisibleInPlan(field, plannedValues)) continue;

    const isRestriction = field.key === restrictionKey;
    const isVisibleRequired = requiredKeys.includes(field.key);
    // Always-visible selects with defaults (not gated by showWhen) — useful for form validity.
    const alwaysVisibleSelectDefault =
      (field.type === "select" || field.type === "radio") &&
      field.defaultValue &&
      !field.showWhen;
    // Controllers we intentionally set (e.g. postType=Offer) even if they had showWhen=null.
    const plannedController =
      (field.type === "select" || field.type === "radio") &&
      plannedValues[field.key] &&
      (field.key === "postType" ||
        field.key === "primaryGoal" ||
        field.key === "installationMethod");

    if (
      isVisibleRequired ||
      field.required ||
      (isRestriction && fillRestriction) ||
      alwaysVisibleSelectDefault ||
      plannedController
    ) {
      pushField(field, { forceRequired: isVisibleRequired });
    }
  }

  // Ensure every *visible* required key is planned.
  for (const key of requiredKeys) {
    if (plan.some((p) => p.key === key)) continue;
    const field = fieldsByKey.get(key);
    if (!field) continue;
    pushField(field, { forceRequired: true });
  }

  // Safety: ensure restriction field is always planned when present and visible.
  if (
    fillRestriction &&
    restrictionKey &&
    !plan.some((p) => p.key === restrictionKey)
  ) {
    const field = fieldsByKey.get(restrictionKey);
    if (field && isFieldVisibleInPlan(field, plannedValues)) {
      pushField(field);
    }
  }

  // Fill order: lower dependency depth first so showWhen controllers apply first.
  plan.sort((a, b) => {
    const fa = fieldsByKey.get(a.key);
    const fb = fieldsByKey.get(b.key);
    return dependencyDepth(fa, fieldsByKey) - dependencyDepth(fb, fieldsByKey);
  });

  return {
    /** Canonical catalog slug (schema file + `?template=`). */
    slug: canonicalSlug,
    /** Slug as passed by the caller (may be a known alias). */
    requestedSlug,
    aliased,
    title: schema.title ?? canonicalSlug,
    restrictionKey: fillRestriction ? restrictionKey : null,
    restrictionKeyPresent: restrictionKey,
    smokeGoal,
    requireRestriction: fillRestriction && !!restrictionKey,
    restrictionText: fillRestriction ? restrictionText : "",
    /** Required keys that are visible under the planned fixture values. */
    requiredKeys,
    schemaRequiredKeys,
    plannedValues: { ...plannedValues },
    revealNotes,
    fields: plan,
  };
}
