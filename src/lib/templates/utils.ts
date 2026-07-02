import type { TemplateVariable } from "@/types/template";

export function parseTemplateVariables(raw: unknown): TemplateVariable[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(
      (item): item is TemplateVariable =>
        typeof item === "object" &&
        item !== null &&
        "key" in item &&
        "label" in item &&
        typeof (item as TemplateVariable).key === "string" &&
        typeof (item as TemplateVariable).label === "string",
    )
    .map((item) => ({
      key: item.key,
      label: item.label,
      placeholder: item.placeholder,
      required: item.required ?? false,
    }));
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