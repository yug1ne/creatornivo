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
  /** Visible when the controlling field contains a valid HTTP(S) URL. */
  isValidUrl?: boolean;
  /** Visible when the controlling field text contains this value (or any of these). */
  contains?: string | string[];
}

/**
 * Show field only when conditions match (client-side form UX).
 * - Single clause: same as TemplateFieldShowWhenClause
 * - anyOf: visible if any clause matches (OR)
 * - allOf: visible only if every clause matches (AND)
 */
export type TemplateFieldShowWhen =
  | TemplateFieldShowWhenClause
  | { anyOf: TemplateFieldShowWhenClause[] }
  | { allOf: TemplateFieldShowWhenClause[] };

export interface TemplateVariable {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  /** Field control type. Defaults to text when omitted. */
  type?: TemplateFieldType;
  /** Optional semantic validation/rendering format for text fields. */
  format?: "url";
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
  /** Maximum accepted string length for the field value. */
  maxLength?: number;
  /** Minimum accepted numeric value when type is number. */
  min?: number;
  /** Maximum accepted numeric value when type is number. */
  max?: number;
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
