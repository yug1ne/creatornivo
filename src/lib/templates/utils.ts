import type {
  TemplateFieldType,
  TemplateVariable,
  TemplateVariableHelp,
} from "@/types/template";

const FIELD_TYPES: TemplateFieldType[] = ["text", "textarea", "select"];

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
        group: typeof item.group === "string" ? item.group : undefined,
        groupTitle:
          typeof item.groupTitle === "string" ? item.groupTitle : undefined,
        hint: typeof item.hint === "string" ? item.hint : undefined,
        help: parseHelp(item.help),
        options: options && options.length > 0 ? options : undefined,
        fullWidth: item.fullWidth === true,
      } satisfies TemplateVariable;
    });
}

export function fillPromptTemplate(
  prompt: string,
  values: Record<string, string>,
): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key]?.trim();
    return value || `[${key}]`;
  });
}

export function validateVariableValues(
  variables: TemplateVariable[],
  values: Record<string, string>,
): string | null {
  for (const variable of variables) {
    if (variable.required && !values[variable.key]?.trim()) {
      return `Field "${variable.label}" is required`;
    }
  }

  return null;
}

export function buildDefaultValues(
  variables: TemplateVariable[],
): Record<string, string> {
  return variables.reduce<Record<string, string>>((acc, variable) => {
    acc[variable.key] = "";
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
