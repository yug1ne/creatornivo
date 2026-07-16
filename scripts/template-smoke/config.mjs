/** Shared constants for local template smoke automation. */

/**
 * Smoke goals (orthogonal to mode dry-run | batch-smoke | quota-exhaustion):
 *
 * - normal:  Can the template produce usable output under everyday constraints?
 * - safety:  Does exact user-banned phrase enforcement work?
 */
export const SMOKE_GOALS = ["normal", "safety"];
export const DEFAULT_SMOKE_GOAL = "normal";

/**
 * Forbidden-phrase safety restrictions — exact phrases the app validator enforces.
 * Used only when --smoke-goal safety.
 */
export const SAFETY_RESTRICTION_TEXT = [
  "Do not use the phrases: streamline, transform, effortlessly, boost engagement, increase sales.",
  "Do not promise guaranteed results, growth, revenue, leads, ROI, cost savings, or productivity.",
].join("\n");

/**
 * Normal-generation constraints — no exact banned-phrase lists.
 * Harmless tone guidance only (or leave restriction empty when field optional).
 */
export const NORMAL_RESTRICTION_TEXT =
  "Keep claims factual and specific to the supplied product details. Prefer clear language over hype.";

/** @deprecated Prefer SAFETY_RESTRICTION_TEXT; kept for older imports. */
export const STANDARD_RESTRICTION_TEXT = SAFETY_RESTRICTION_TEXT;

/** Exact banned phrases — hard fail (case-insensitive) in safety smoke body checks. */
export const FORBIDDEN_HARD = [
  "streamline",
  "transform",
  "effortlessly",
  "boost engagement",
  "increase sales",
];

/** Variant warnings only — do not hard-fail. */
export const FORBIDDEN_WARN = [
  "streamlined",
  "streamlining",
  "effortless",
  "transforms",
  "transformed",
  "boosting engagement",
  "increasing sales",
];

/**
 * Prefer these form keys for restriction text (first match that exists on the form).
 */
export const RESTRICTION_FIELD_PRIORITY = [
  "restrictionsAndDisclosures",
  "restrictions",
  "claimsRestrictions",
  "prohibitedClaims",
  "claimsAndRestrictions",
  "wordsToAvoid",
  "contentToAvoid",
  "doNotUse",
  "keywordsToAvoid",
  "mustUseOrAvoidWording",
  "sensitiveClaims",
  "complianceNotes",
  "boundariesRestrictions",
  "claimsToAvoid",
  "additionalRequirements",
  "additionalContext",
  "commercialNotes",
];

/** Default batch for real smoke (never all 45). */
export const DEFAULT_BATCH = [
  "landing-page-copy",
  "product-description",
  "paid-ad-copy",
  "app-store-listing",
  "amazon-listing",
];

/**
 * Focused 15-template burn list for quota-exhaustion (85→100 on Pro 100/mo).
 * Prefer templates already proven in normal smoke; avoid inventing new slugs.
 */
export const QUOTA_EXHAUST_BATCH = [
  "landing-page-copy",
  "app-store-listing",
  "blog-article",
  "product-description",
  "paid-ad-copy",
  "google-business-profile-post",
  "short-form-video",
  "in-app-ux-copy",
  "webinar-package",
  "sales-proposal",
  "amazon-listing",
  "kickstarter-campaign",
  "press-release",
  "youtube-video-package",
  "seo-meta-tags",
];

/** Template used for the single post-exhaust block attempt. */
export const QUOTA_BLOCK_CHECK_TEMPLATE = "landing-page-copy";

export const DEFAULT_BATCH_SIZE = 5;
export const MAX_CONSECUTIVE_UNKNOWN_FAILURES = 2;
/** Wall-clock wait after Generate click for stream to finish (headers + body). */
export const GENERATION_TIMEOUT_MS = 240_000;
/** How long to wait for the generate request / "Generating..." UI to start. */
export const GENERATION_START_TIMEOUT_MS = 30_000;
export const NAV_TIMEOUT_MS = 60_000;

export const MODES = ["dry-run", "batch-smoke", "quota-exhaustion"];

/** Statuses that count as overall smoke success for a given goal. */
export const SUCCESS_STATUSES_BY_GOAL = {
  normal: new Set([
    "PASS",
    "DRY_RUN_PASS",
    // Expected outcomes only during quota-exhaustion post-check / at-limit block.
    "QUOTA_BLOCKED",
    "QUOTA_EXHAUSTED",
  ]),
  safety: new Set([
    "PASS",
    "SAFETY_PASS_MODEL_COMPLIANT",
    "SAFETY_PASS_VALIDATION_BLOCKED",
    "DRY_RUN_PASS",
    "QUOTA_BLOCKED",
    "QUOTA_EXHAUSTED",
  ]),
};

/** Product/infra statuses — not template quality failures. */
export const NON_TEMPLATE_FAILURE_STATUSES = new Set([
  "QUOTA_SOURCE_MISMATCH",
  "QUOTA_LEAK",
  "API_ERROR",
  "GENERATION_TIMEOUT",
]);

export function restrictionTextForGoal(smokeGoal) {
  if (smokeGoal === "safety") return SAFETY_RESTRICTION_TEXT;
  // normal: mild constraints, no exact ban list
  return NORMAL_RESTRICTION_TEXT;
}

export function shouldFillRestrictionField(smokeGoal) {
  // safety: always inject ban list when field exists
  // normal: leave empty (optional field) so we test ordinary generation
  return smokeGoal === "safety";
}
