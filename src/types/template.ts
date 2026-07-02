import type { Plan } from "@/config/plans";

export type TemplateCategory =
  | "x_thread"
  | "linkedin_post"
  | "newsletter"
  | "instagram_post"
  | "blog"
  | "email"
  | "marketing"
  | "product"
  | "youtube"
  | "seo"
  | "other";

export interface TemplateVariable {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface Template {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  prompt: string;
  variables: TemplateVariable[];
  requiredPlan: Plan;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  prompt: string;
  variables: TemplateVariable[];
  requiredPlan: Plan;
  isLocked: boolean;
}