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
  | "other"
  | "facebook_post"
  | "threads_post"
  | "pinterest"
  | "reddit"
  | "google_business"
  | "tiktok"
  | "ecommerce"
  | "community"
  | "product_launch"
  | "sales"
  | "app_ux";

export type TemplateFieldType = "text" | "textarea" | "select" | "number";

export interface TemplateVariableHelp {
  what: string;
  why: string;
  example: string;
  avoid: string;
}

/** Single condition: another field equals / not-equals a value. */
export interface TemplateFieldShowWhenClause {
  key: string;
  /** Visible when the controlling field equals this value (or any of these). */
  equals?: string | string[];
  /** Visible when the controlling field is not this value (or not any of these). */
  notEquals?: string | string[];
}

/**
 * Show field only when conditions match (client-side form UX).
 * - Single clause: same as TemplateFieldShowWhenClause
 * - anyOf: visible if any clause matches (OR)
 */
export type TemplateFieldShowWhen =
  | TemplateFieldShowWhenClause
  | { anyOf: TemplateFieldShowWhenClause[] };

export interface TemplateVariable {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  /** Field control type. Defaults to text when omitted. */
  type?: TemplateFieldType;
  /** Group id for collapsible form sections. */
  group?: string;
  /** Display title for the group (catalog convenience). */
  groupTitle?: string;
  /** Short hint under the field. */
  hint?: string;
  /** Full help for guide articles. */
  help?: TemplateVariableHelp;
  /** Options when type is select. */
  options?: string[];
  /** Span full row in a 2-column grid. */
  fullWidth?: boolean;
  /** Initial value for the generate form (select defaults, etc.). */
  defaultValue?: string;
  /** Hide until another field matches this condition. */
  showWhen?: TemplateFieldShowWhen;
}

export interface TemplateFormGroup {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
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
