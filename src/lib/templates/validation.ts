import type { Plan } from "@/config/plans";
import type { TemplateCategory, TemplateVariable } from "@/types/template";

import { parseTemplateVariables } from "./utils";
import { slugifyTitle } from "./slug";

const CATEGORIES: TemplateCategory[] = [
  "x_thread",
  "linkedin_post",
  "newsletter",
  "instagram_post",
  "blog",
  "email",
  "marketing",
  "product",
  "youtube",
  "seo",
  "other",
];

export interface TemplateFormData {
  title: string;
  slug: string;
  description: string;
  prompt: string;
  variables: TemplateVariable[];
  category: TemplateCategory;
  requiredPlan: Plan;
  isActive: boolean;
}

export function parseTemplateFormBody(body: unknown): {
  data?: TemplateFormData;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Invalid data" };
  }

  const raw = body as Record<string, unknown>;

  const title = String(raw.title ?? "").trim();
  const description = String(raw.description ?? "").trim();
  const prompt = String(raw.prompt ?? "").trim();
  const category = String(raw.category ?? "") as TemplateCategory;
  const requiredPlan = String(raw.requiredPlan ?? "free") as Plan;
  const isActive = raw.isActive !== false;

  let slug = String(raw.slug ?? "").trim();
  if (!slug && title) {
    slug = slugifyTitle(title);
  }

  let variables: TemplateVariable[] = [];

  if (Array.isArray(raw.variables)) {
    variables = parseTemplateVariables(raw.variables);
  } else if (typeof raw.variablesJson === "string") {
    try {
      variables = parseTemplateVariables(JSON.parse(raw.variablesJson));
    } catch {
      return { error: "Invalid JSON in the variables field" };
    }
  }

  if (!title) return { error: "Title is required" };
  if (!slug) return { error: "Slug is required" };
  if (!description) return { error: "Description is required" };
  if (!prompt) return { error: "Prompt is required" };
  if (!CATEGORIES.includes(category)) {
    return { error: "Invalid category" };
  }
  if (requiredPlan !== "free" && requiredPlan !== "pro") {
    return { error: "Plan must be free or pro" };
  }

  return {
    data: {
      title,
      slug,
      description,
      prompt,
      variables,
      category,
      requiredPlan,
      isActive,
    },
  };
}