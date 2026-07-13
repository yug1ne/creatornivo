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

export interface TemplateRenderCheck {
  unresolvedVariables: string[];
  unsafeTokens: string[];
}

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

  if (/^(undefined|null|N\/A|\[object Object\])$/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function renderPromptLine(
  line: string,
  values: Record<string, string>,
): {
  renderedLine: string;
  hasVariable: boolean;
  hasEmptyVariable: boolean;
  hasFilledVariable: boolean;
} {
  let hasVariable = false;
  let hasEmptyVariable = false;
  let hasFilledVariable = false;

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
      return "";
    },
  );

  return {
    renderedLine,
    hasVariable,
    hasEmptyVariable,
    hasFilledVariable,
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
): string {
  const renderedLines: string[] = [];

  for (const line of prompt.split(/\r?\n/)) {
    const {
      renderedLine,
      hasVariable,
      hasEmptyVariable,
      hasFilledVariable,
    } = renderPromptLine(line, values);

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

    renderedLines.push(renderedLine);
  }

  return sanitizeRenderedPromptText(
    collapseExcessBlankLines(renderedLines).join("\n").trim(),
  );
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

export function validateVariableValues(
  variables: TemplateVariable[],
  values: Record<string, string>,
): string | null {
  for (const variable of variables) {
    if (!isTemplateFieldVisible(variable, values)) continue;
    const value = values[variable.key]?.trim() ?? "";

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

  return null;
}

export function buildDefaultValues(
  variables: TemplateVariable[],
): Record<string, string> {
  return variables.reduce<Record<string, string>>((acc, variable) => {
    acc[variable.key] = variable.defaultValue?.trim()
      ? variable.defaultValue
      : "";
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
