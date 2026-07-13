import type {
  TemplateFieldShowWhen,
  TemplateFieldShowWhenClause,
  TemplateFieldType,
  TemplateVariable,
  TemplateVariableHelp,
} from "@/types/template";

const FIELD_TYPES: TemplateFieldType[] = [
  "text",
  "textarea",
  "select",
  "number",
];
const TEMPLATE_VARIABLE_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;
const UNSAFE_RENDERED_TOKEN_PATTERNS = [
  { token: "undefined", pattern: /\bundefined\b/i },
  { token: "null", pattern: /\bnull\b/i },
  { token: "N/A", pattern: /\bN\/A\b/i },
  { token: "[object Object]", pattern: /\[object Object\]/i },
] as const;
const OPTIONAL_FIELD_RISK_CATEGORY_ORDER = [
  "url",
  "commercial",
  "proof",
  "timing",
  "disclosure",
  "contact",
  "visual",
] as const;

const OPTIONAL_FIELD_RISK_TOKENS = {
  url: ["url", "urls", "link", "links"],
  commercial: [
    "offer",
    "offers",
    "price",
    "prices",
    "pricing",
    "discount",
    "discounts",
    "promo",
    "promos",
    "coupon",
    "coupons",
    "availability",
    "bonus",
    "bonuses",
    "scarcity",
  ],
  proof: [
    "proof",
    "proofs",
    "evidence",
    "source",
    "sources",
    "citation",
    "citations",
    "research",
    "credential",
    "credentials",
    "testimonial",
    "testimonials",
    "quote",
    "quotes",
    "quotation",
    "quotations",
    "statistic",
    "statistics",
    "stats",
  ],
  timing: [
    "date",
    "dates",
    "deadline",
    "deadlines",
    "time",
    "times",
    "timezone",
    "timezones",
    "location",
    "locations",
    "jurisdiction",
    "jurisdictions",
  ],
  disclosure: [
    "affiliation",
    "affiliations",
    "affiliate",
    "sponsor",
    "sponsors",
    "sponsored",
    "sponsorship",
    "sponsorships",
    "partner",
    "partners",
    "partnership",
    "partnerships",
    "disclosure",
    "disclosures",
    "relationship",
    "relationships",
  ],
  contact: ["phone", "phones", "handle", "handles"],
  visual: [
    "visual",
    "visuals",
    "image",
    "images",
    "asset",
    "assets",
    "screenshot",
    "screenshots",
    "photo",
    "photos",
  ],
} as const;

export interface TemplateRenderCheck {
  unresolvedVariables: string[];
  unsafeTokens: string[];
}

export type OptionalFieldRiskCategory =
  (typeof OPTIONAL_FIELD_RISK_CATEGORY_ORDER)[number];

export type TemplateFieldDefaultClassification =
  | "required_user_choice"
  | "optional_no_preference"
  | "explicit_absence"
  | "auto_behavior"
  | "safe_technical_default";

function parseHelp(raw: unknown): TemplateVariableHelp | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const h = raw as Record<string, unknown>;
  if (
    typeof h.what !== "string" ||
    typeof h.why !== "string" ||
    typeof h.example !== "string" ||
    typeof h.avoid !== "string"
  ) {
    return undefined;
  }
  return {
    what: h.what,
    why: h.why,
    example: h.example,
    avoid: h.avoid,
  };
}

function parseShowWhenClause(
  raw: unknown,
): TemplateFieldShowWhenClause | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  if (typeof s.key !== "string" || !s.key) return undefined;

  const result: TemplateFieldShowWhenClause = { key: s.key };

  if (typeof s.equals === "string") {
    result.equals = s.equals;
  } else if (Array.isArray(s.equals)) {
    const list = s.equals.filter((o): o is string => typeof o === "string");
    if (list.length) result.equals = list;
  }

  if (typeof s.notEquals === "string") {
    result.notEquals = s.notEquals;
  } else if (Array.isArray(s.notEquals)) {
    const list = s.notEquals.filter((o): o is string => typeof o === "string");
    if (list.length) result.notEquals = list;
  }

  if (s.isValidUrl === true) {
    result.isValidUrl = true;
  }

  if (typeof s.contains === "string") {
    result.contains = s.contains;
  } else if (Array.isArray(s.contains)) {
    const list = s.contains.filter((o): o is string => typeof o === "string");
    if (list.length) result.contains = list;
  }

  if (
    result.equals === undefined &&
    result.notEquals === undefined &&
    result.isValidUrl !== true &&
    result.contains === undefined
  ) {
    return undefined;
  }

  return result;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseShowWhen(raw: unknown): TemplateFieldShowWhen | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;

  if (Array.isArray(s.anyOf)) {
    const clauses = s.anyOf
      .map(parseShowWhenClause)
      .filter((c): c is TemplateFieldShowWhenClause => Boolean(c));
    if (clauses.length === 0) return undefined;
    return { anyOf: clauses };
  }

  if (Array.isArray(s.allOf)) {
    const clauses = s.allOf
      .map(parseShowWhenClause)
      .filter((c): c is TemplateFieldShowWhenClause => Boolean(c));
    if (clauses.length === 0) return undefined;
    return { allOf: clauses };
  }

  return parseShowWhenClause(raw);
}

function clauseMatches(
  clause: TemplateFieldShowWhenClause,
  values: Record<string, string>,
): boolean {
  const current = values[clause.key] ?? "";

  if (clause.equals !== undefined) {
    const list = Array.isArray(clause.equals) ? clause.equals : [clause.equals];
    if (!list.includes(current)) return false;
  }

  if (clause.notEquals !== undefined) {
    const list = Array.isArray(clause.notEquals)
      ? clause.notEquals
      : [clause.notEquals];
    if (list.includes(current)) return false;
  }

  if (clause.isValidUrl === true && !isHttpUrl(current)) {
    return false;
  }

  if (clause.contains !== undefined) {
    const list = Array.isArray(clause.contains)
      ? clause.contains
      : [clause.contains];
    if (!list.some((item) => current.includes(item))) return false;
  }

  return true;
}

/** Whether a field should render given current form values. */
export function isTemplateFieldVisible(
  variable: TemplateVariable,
  values: Record<string, string>,
): boolean {
  const when = variable.showWhen;
  if (!when) return true;

  if ("anyOf" in when && Array.isArray(when.anyOf)) {
    return when.anyOf.some((clause) => clauseMatches(clause, values));
  }

  if ("allOf" in when && Array.isArray(when.allOf)) {
    return when.allOf.every((clause) => clauseMatches(clause, values));
  }

  return clauseMatches(when as TemplateFieldShowWhenClause, values);
}

export function parseTemplateVariables(raw: unknown): TemplateVariable[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        "key" in item &&
        "label" in item &&
        typeof (item as { key: unknown }).key === "string" &&
        typeof (item as { label: unknown }).label === "string",
    )
    .map((item) => {
      const typeRaw = item.type;
      const type =
        typeof typeRaw === "string" &&
        FIELD_TYPES.includes(typeRaw as TemplateFieldType)
          ? (typeRaw as TemplateFieldType)
          : undefined;

      const options = Array.isArray(item.options)
        ? item.options.filter((o): o is string => typeof o === "string")
        : undefined;

      return {
        key: item.key as string,
        label: item.label as string,
        placeholder:
          typeof item.placeholder === "string" ? item.placeholder : undefined,
        required: Boolean(item.required ?? false),
        type,
        format: item.format === "url" ? "url" : undefined,
        group: typeof item.group === "string" ? item.group : undefined,
        groupTitle:
          typeof item.groupTitle === "string" ? item.groupTitle : undefined,
        hint: typeof item.hint === "string" ? item.hint : undefined,
        help: parseHelp(item.help),
        options: options && options.length > 0 ? options : undefined,
        fullWidth: item.fullWidth === true,
        defaultValue:
          typeof item.defaultValue === "string" ? item.defaultValue : undefined,
        maxLength:
          typeof item.maxLength === "number" && Number.isFinite(item.maxLength)
            ? item.maxLength
            : undefined,
        min:
          typeof item.min === "number" && Number.isFinite(item.min)
            ? item.min
            : undefined,
        max:
          typeof item.max === "number" && Number.isFinite(item.max)
            ? item.max
            : undefined,
        showWhen: parseShowWhen(item.showWhen),
      } satisfies TemplateVariable;
    });
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function getStringValue(values: Record<string, string>, key: string): string {
  const value = values[key];
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (
    /^(undefined|null|N\/A|\[object Object\]|No preference|Not specified)$/i.test(
      trimmed,
    )
  ) {
    return "";
  }

  return trimmed;
}

export function isTemplateFieldValueFilled(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return !/^(|undefined|null|N\/A|\[object Object\]|No preference|Not specified)$/i.test(
    value.trim(),
  );
}

function getVariableLabel(variable: TemplateVariable): string {
  return variable.label.trim() || variable.key;
}

function normalizeFieldText(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-\s/]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function fieldText(variable: TemplateVariable): string {
  return normalizeFieldText(`${variable.key} ${variable.label}`);
}

function defaultText(variable: TemplateVariable): string {
  return normalizeFieldText(variable.defaultValue ?? "");
}

function fieldHasAny(
  variable: TemplateVariable,
  words: readonly string[],
): boolean {
  const text = fieldText(variable);
  return words.some((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
}

function defaultIsExplicitAbsence(value: string): boolean {
  return (
    /^(none|off|false|no)$/i.test(value) ||
    /^no\b/i.test(value) ||
    /\bno (?:promotion|affiliation|disclosure|button|hashtags?|visual|commercial offer|material affiliation|prior relationship)\b/i.test(value) ||
    /\borganic\b.*\bno promotion\b/i.test(value)
  );
}

function defaultIsNoPreference(value: string): boolean {
  return (
    /^(no preference|not specified)$/i.test(value) ||
    /\bnot specified\b/i.test(value) ||
    /\bor unknown\b/i.test(value) ||
    /\bunknown\b/i.test(value)
  );
}

function defaultIsAutoBehavior(value: string): boolean {
  return /\bauto\b|auto-detect|platform appropriate|platform-appropriate/i.test(value);
}

function isRequiredTechnicalDefault(variable: TemplateVariable): boolean {
  return fieldHasAny(variable, [
    "language",
    "duration",
    "minutes",
    "count",
    "variants",
    "versions",
  ]);
}

function isSafeTechnicalDefault(variable: TemplateVariable): boolean {
  if (!variable.defaultValue?.trim()) return false;
  if (variable.type === "number") return true;

  const text = fieldText(variable);
  const value = defaultText(variable);

  if (fieldHasAny(variable, ["language"])) return true;
  if (
    fieldHasAny(variable, ["count", "variants", "versions", "minutes"]) &&
    /^\d+(?:\s*[–-]\s*\d+)?$/.test(value)
  ) {
    return true;
  }
  if (
    /\b(markdown|plain text|clean web copy|guidance only|standard|balanced)\b/.test(
      value,
    ) &&
    /\b(format|formatting|output|structure|length|duration|detail|depth|pacing)\b/.test(
      text,
    )
  ) {
    return true;
  }

  return false;
}

function isOptionalOptInDefault(variable: TemplateVariable): boolean {
  const value = defaultText(variable);
  if (!/^(yes|on|enabled|true)$/.test(value)) return false;

  return fieldHasAny(variable, [
    "visual",
    "image",
    "screenshot",
    "subheadline",
    "quotes",
    "faq",
    "hook",
    "description",
    "chapters",
    "comment",
  ]);
}

function isOptionalActionDefault(variable: TemplateVariable): boolean {
  const value = variable.defaultValue?.trim() ?? "";
  if (!value) return false;
  if (
    defaultIsAutoBehavior(value) ||
    defaultIsExplicitAbsence(value) ||
    defaultIsNoPreference(value)
  ) {
    return false;
  }

  return fieldHasAny(variable, [
    "action",
    "cta",
    "button",
    "promotion",
    "offer",
    "relationship",
    "affiliation",
    "disclosure",
  ]);
}

export function classifyTemplateFieldDefault(
  variable: TemplateVariable,
): TemplateFieldDefaultClassification {
  const value = variable.defaultValue?.trim() ?? "";

  if (!value) {
    return variable.required
      ? "required_user_choice"
      : "optional_no_preference";
  }

  if (isSafeTechnicalDefault(variable)) {
    return "safe_technical_default";
  }

  if (variable.required && variable.type === "select") {
    return isRequiredTechnicalDefault(variable)
      ? "safe_technical_default"
      : "required_user_choice";
  }

  if (defaultIsNoPreference(value)) {
    return "optional_no_preference";
  }

  if (defaultIsExplicitAbsence(value)) {
    return "explicit_absence";
  }

  if (defaultIsAutoBehavior(value)) {
    return "auto_behavior";
  }

  if (!variable.required && (isOptionalOptInDefault(variable) || isOptionalActionDefault(variable))) {
    return "optional_no_preference";
  }

  return "safe_technical_default";
}

export function isTemplateDefaultActive(variable: TemplateVariable): boolean {
  if (!variable.defaultValue?.trim()) return false;
  const classification = classifyTemplateFieldDefault(variable);
  return (
    classification === "explicit_absence" ||
    classification === "auto_behavior" ||
    classification === "safe_technical_default"
  );
}

export function getTemplateInitialValue(variable: TemplateVariable): string {
  return isTemplateDefaultActive(variable) ? variable.defaultValue ?? "" : "";
}

function hasMeaningfulDefault(variable: TemplateVariable): boolean {
  return isTemplateDefaultActive(variable);
}

function normalizeOptionalFieldTokens(variable: TemplateVariable): string[] {
  const raw = `${variable.key} ${variable.label}`;
  const spaced = raw
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-\s/]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ");

  return [
    ...new Set(
      spaced
        .toLowerCase()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  ];
}

function hasAnyToken(tokens: Set<string>, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => tokens.has(candidate));
}

function hasTokenSequence(tokens: string[], sequence: readonly string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) return false;

  return tokens.some((_, index) =>
    sequence.every((token, offset) => tokens[index + offset] === token),
  );
}

export function classifyOptionalFieldRiskCategories(
  variable: TemplateVariable,
): OptionalFieldRiskCategory[] {
  const tokenList = normalizeOptionalFieldTokens(variable);
  const tokens = new Set(tokenList);

  return OPTIONAL_FIELD_RISK_CATEGORY_ORDER.filter((category) => {
    if (hasAnyToken(tokens, OPTIONAL_FIELD_RISK_TOKENS[category])) {
      return true;
    }

    if (category === "timing") {
      return hasTokenSequence(tokenList, ["service", "area"]);
    }

    if (category === "visual") {
      return hasTokenSequence(tokenList, ["alt", "text"]);
    }

    if (category === "contact") {
      return (
        hasTokenSequence(tokenList, ["contact", "details"]) ||
        hasTokenSequence(tokenList, ["contact", "method"]) ||
        hasTokenSequence(tokenList, ["media", "contact"]) ||
        hasTokenSequence(tokenList, ["email", "address"]) ||
        hasTokenSequence(tokenList, ["sender", "email"]) ||
        hasTokenSequence(tokenList, ["email", "sender", "name"]) ||
        hasTokenSequence(tokenList, ["business", "postal", "address"]) ||
        hasTokenSequence(tokenList, ["postal", "address"]) ||
        hasTokenSequence(tokenList, ["mailing", "address"]) ||
        hasTokenSequence(tokenList, ["sender", "name"])
      );
    }

    return false;
  });
}

function getBlankOptionalVariables(
  variables: TemplateVariable[],
  values: Record<string, string>,
): TemplateVariable[] {
  return variables.filter(
    (variable) =>
      !variable.required &&
      !hasMeaningfulDefault(variable) &&
      !getStringValue(values, variable.key),
  );
}

function buildBlankOptionalFieldRules(
  variables: TemplateVariable[],
  values: Record<string, string>,
): string[] {
  const blankVariables = getBlankOptionalVariables(variables, values);
  if (blankVariables.length === 0) return [];

  const labels = [...new Set(blankVariables.map(getVariableLabel))].sort();
  const categories = new Set(
    blankVariables.flatMap((variable) =>
      classifyOptionalFieldRiskCategories(variable),
    ),
  );
  const lines = [
    "BLANK OPTIONAL FIELD RULES",
    "The following optional fields are blank. Do not invent, infer, or output details that depend on them unless another supplied input explicitly provides the same fact:",
    ...labels.map((label) => `- ${label}`),
  ];

  if (categories.has("url")) {
    lines.push(
      "For blank URL or link fields, do not create links, click-here wording, link-below wording, download-here wording, # anchors, example.com, URL_HERE, LINK_HERE, [insert link], or any other placeholder destination.",
    );
  }

  if (categories.has("commercial")) {
    lines.push(
      "For blank offer or commercial fields, do not invent prices, discounts, promo codes, bonuses, deadlines, availability, scarcity, eligibility, guarantees, or commercial relationships.",
    );
  }

  if (categories.has("proof")) {
    lines.push(
      "For blank proof, source, or evidence fields, do not invent statistics, testimonials, ratings, quotations, studies, citations, credentials, awards, customer stories, or source names.",
    );
  }

  if (categories.has("timing")) {
    lines.push(
      "For blank date, time, location, area, or jurisdiction fields, do not invent dates, times, addresses, service areas, locations, time zones, or jurisdiction-specific claims.",
    );
  }

  if (categories.has("disclosure")) {
    lines.push(
      "For blank disclosure or affiliation fields, do not add disclosures, sponsorship language, affiliate wording, partnership claims, or relationship claims unless another supplied input explicitly requires them.",
    );
  }

  if (categories.has("contact")) {
    lines.push(
      "For blank contact fields, do not invent email addresses, phone numbers, postal addresses, social handles, contact names, or placeholder contact details.",
    );
  }

  if (categories.has("visual")) {
    lines.push(
      "For blank visual or alt-text fields, do not describe a specific supplied asset, screenshot, customer image, result image, interface, or visual proof as fact.",
    );
  }

  return lines;
}

function renderPromptLine(
  line: string,
  values: Record<string, string>,
  variablesByKey: Map<string, TemplateVariable>,
): {
  renderedLine: string;
  hasVariable: boolean;
  hasEmptyVariable: boolean;
  hasFilledVariable: boolean;
  emptyKeys: string[];
} {
  let hasVariable = false;
  let hasEmptyVariable = false;
  let hasFilledVariable = false;
  const emptyKeys: string[] = [];
  const lineWithEmptyVariables = line.replace(TEMPLATE_VARIABLE_PATTERN, "");
  const rendersAsInputLine = isEmptyOptionalInputLine(lineWithEmptyVariables);

  TEMPLATE_VARIABLE_PATTERN.lastIndex = 0;
  const renderedLine = line.replace(
    TEMPLATE_VARIABLE_PATTERN,
    (_, key: string) => {
      hasVariable = true;
      const value = getStringValue(values, key);

      if (value) {
        hasFilledVariable = true;
        return value;
      }

      hasEmptyVariable = true;
      emptyKeys.push(key);
      if (!rendersAsInputLine) {
        const variable = variablesByKey.get(key);
        if (variable && !variable.required) {
          const label = getVariableLabel(variable);
          const isUrlLike =
            classifyOptionalFieldRiskCategories(variable).includes("url");
          return isUrlLike
            ? `a real user-supplied ${label}`
            : `user-supplied ${label}`;
        }
      }

      return "";
    },
  );

  return {
    renderedLine,
    hasVariable,
    hasEmptyVariable,
    hasFilledVariable,
    emptyKeys,
  };
}

function isEmptyOptionalInputLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  const withoutListMarker = trimmed
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();

  if (!withoutListMarker) return true;

  return /^[A-Za-z0-9 _/&()[\],.'’"“”+-]+:\s*$/.test(withoutListMarker);
}

function cleanEmptyVariableArtifacts(line: string): string {
  const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
  let cleaned = line.slice(leadingWhitespace.length);

  cleaned = cleaned
    .replace(/``/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*(and|or)\s*(?=[,.;:])/gi, "")
    .replace(/\b(and|or)\s*(?=[,.;:])/gi, "")
    .replace(/\b(from|with|using|in|by)\s+(?=[,.;:])/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([)\]])/g, "$1")
    .replace(/([(])\s+/g, "$1")
    .trimEnd();

  cleaned = cleaned
    .replace(/,\s*\./g, ".")
    .replace(/,\s*;/g, ";")
    .replace(/,\s*:/g, ":")
    .replace(/\s+,/g, ",")
    .replace(/\bUse\s+only\s+/gi, "Use only ")
    .replace(/\bInclude\s+only\s+/gi, "Include only ")
    .replace(/\bApply\s+only\s+/gi, "Apply only ")
    .replace(/\bTreat\s+only\s+/gi, "Treat only ");

  return `${leadingWhitespace}${cleaned}`;
}

function collapseExcessBlankLines(lines: string[]): string[] {
  const collapsed: string[] = [];

  for (const line of lines) {
    const isBlank = line.trim() === "";
    const previous = collapsed[collapsed.length - 1];
    const previousIsBlank = previous !== undefined && previous.trim() === "";
    const beforePrevious = collapsed[collapsed.length - 2];
    const beforePreviousIsBlank =
      beforePrevious !== undefined && beforePrevious.trim() === "";

    if (isBlank && previousIsBlank && beforePreviousIsBlank) continue;
    collapsed.push(line);
  }

  return collapsed;
}

function sanitizeRenderedPromptText(prompt: string): string {
  return prompt.replace(/\bN\/A\b/gi, "not applicable");
}

export function fillPromptTemplate(
  prompt: string,
  values: Record<string, string>,
  variables: TemplateVariable[] = [],
): string {
  const renderedLines: string[] = [];
  const variablesByKey = new Map(
    variables.map((variable) => [variable.key, variable]),
  );

  for (const line of prompt.split(/\r?\n/)) {
    const {
      renderedLine: rawRenderedLine,
      hasVariable,
      hasEmptyVariable,
      hasFilledVariable,
    } = renderPromptLine(line, values, variablesByKey);
    const renderedLine = hasEmptyVariable
      ? cleanEmptyVariableArtifacts(rawRenderedLine)
      : rawRenderedLine;

    if (hasVariable && hasEmptyVariable && !hasFilledVariable) {
      if (isEmptyOptionalInputLine(renderedLine)) {
        const previousLine = renderedLines[renderedLines.length - 1];
        if (
          previousLine !== undefined &&
          isEmptyOptionalInputLine(previousLine)
        ) {
          renderedLines.pop();
        }
        continue;
      }
    }

    if (hasVariable && hasEmptyVariable && !renderedLine.trim()) {
      continue;
    }

    renderedLines.push(renderedLine);
  }

  const renderedPrompt = collapseExcessBlankLines(renderedLines)
    .join("\n")
    .trim();
  const blankOptionalRules = buildBlankOptionalFieldRules(variables, values);
  const promptWithRules =
    blankOptionalRules.length > 0
      ? `${blankOptionalRules.join("\n")}\n\n${renderedPrompt}`
      : renderedPrompt;

  return sanitizeRenderedPromptText(promptWithRules);
}

export function findRenderedPromptIssues(
  renderedPrompt: string,
  declaredVariables: TemplateVariable[] = [],
): TemplateRenderCheck {
  const declaredKeys = new Set(declaredVariables.map((variable) => variable.key));
  const unresolvedVariables: string[] = [];

  TEMPLATE_VARIABLE_PATTERN.lastIndex = 0;
  for (const match of renderedPrompt.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const key = match[1];
    if (declaredKeys.size === 0 || declaredKeys.has(key)) {
      unresolvedVariables.push(key);
    }
  }

  const unsafeTokens = UNSAFE_RENDERED_TOKEN_PATTERNS.filter(({ pattern }) =>
    pattern.test(renderedPrompt),
  ).map(({ token }) => token);

  return {
    unresolvedVariables: unique(unresolvedVariables),
    unsafeTokens: unique(unsafeTokens),
  };
}

export function isRenderedPromptSafe(
  renderedPrompt: string,
  declaredVariables: TemplateVariable[] = [],
): boolean {
  const issues = findRenderedPromptIssues(renderedPrompt, declaredVariables);
  return issues.unresolvedVariables.length === 0 && issues.unsafeTokens.length === 0;
}

function isUrlLikeField(variable: TemplateVariable): boolean {
  return (
    variable.format === "url" ||
    classifyOptionalFieldRiskCategories(variable).includes("url")
  );
}

function isActionLikeField(variable: TemplateVariable): boolean {
  return fieldHasAny(variable, [
    "action",
    "cta",
    "button",
    "step",
    "link",
    "url",
  ]);
}

function isLinkDependentActionValue(value: string): boolean {
  if (!value) return false;
  if (
    defaultIsNoPreference(value) ||
    defaultIsAutoBehavior(value) ||
    defaultIsExplicitAbsence(value)
  ) {
    return false;
  }

  return /\b(?:download|visit|click|book|register|sign up|subscribe|buy|shop|order|learn more|link in bio|website|url|landing page|profile|read more)\b/i.test(
    value,
  );
}

function validateLinkActionDependencies(
  variables: TemplateVariable[],
  values: Record<string, string>,
): string | null {
  const visibleVariables = variables.filter((variable) =>
    isTemplateFieldVisible(variable, values),
  );
  const hasVisibleUrlValue = visibleVariables
    .filter(isUrlLikeField)
    .some((variable) => isHttpUrl(getStringValue(values, variable.key)));

  for (const variable of visibleVariables) {
    if (isUrlLikeField(variable)) continue;
    if (!isActionLikeField(variable)) continue;
    const value = getStringValue(values, variable.key);
    if (!isLinkDependentActionValue(value)) continue;

    if (!hasVisibleUrlValue) {
      return `Field "${variable.label}" requires a URL or link field when it asks for a link-dependent action.`;
    }
  }

  return null;
}

export function validateVariableValues(
  variables: TemplateVariable[],
  values: Record<string, string>,
): string | null {
  for (const variable of variables) {
    if (!isTemplateFieldVisible(variable, values)) continue;
    const value = getStringValue(values, variable.key);

    if (variable.required && !value) {
      return `Field "${variable.label}" is required`;
    }

    if (!value) continue;

    if (variable.maxLength !== undefined && value.length > variable.maxLength) {
      return `Field "${variable.label}" must be ${variable.maxLength} characters or fewer`;
    }

    if (
      variable.type === "select" &&
      variable.options?.length &&
      !variable.options.includes(value)
    ) {
      return `Field "${variable.label}" must use one of the available options`;
    }

    if (variable.format === "url" && !isHttpUrl(value)) {
      return `Field "${variable.label}" must be a valid URL`;
    }

    if (variable.type === "number") {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return `Field "${variable.label}" must be a number`;
      }
      if (variable.min !== undefined && numericValue < variable.min) {
        return `Field "${variable.label}" must be at least ${variable.min}`;
      }
      if (variable.max !== undefined && numericValue > variable.max) {
        return `Field "${variable.label}" must be at most ${variable.max}`;
      }
    }
  }

  return validateLinkActionDependencies(variables, values);
}

export function buildDefaultValues(
  variables: TemplateVariable[],
): Record<string, string> {
  return variables.reduce<Record<string, string>>((acc, variable) => {
    acc[variable.key] = getTemplateInitialValue(variable);
    return acc;
  }, {});
}

/** Group variables for collapsible form sections. */
export function groupTemplateVariables(variables: TemplateVariable[]): {
  groupId: string;
  title: string;
  variables: TemplateVariable[];
}[] {
  const order: string[] = [];
  const map = new Map<string, TemplateVariable[]>();

  for (const variable of variables) {
    const groupId = variable.group || "parameters";
    if (!map.has(groupId)) {
      map.set(groupId, []);
      order.push(groupId);
    }
    map.get(groupId)!.push(variable);
  }

  return order.map((groupId) => {
    const vars = map.get(groupId)!;
    const title =
      vars.find((v) => v.groupTitle)?.groupTitle ||
      (groupId === "parameters"
        ? "Parameters"
        : groupId
            .replace(/_/g, " ")
            .replace(/^./, (c) => c.toUpperCase()));
    return { groupId, title, variables: vars };
  });
}
