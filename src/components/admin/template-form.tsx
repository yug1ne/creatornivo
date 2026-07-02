"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { templateCategoryLabels } from "@/config/template-categories";
import { slugifyTitle } from "@/lib/templates/slug";
import type { Plan } from "@/config/plans";
import type { TemplateCategory, TemplateVariable } from "@/types/template";

export interface TemplateFormValues {
  title: string;
  slug: string;
  description: string;
  prompt: string;
  variablesJson: string;
  category: TemplateCategory;
  requiredPlan: Plan;
  isActive: boolean;
}

interface TemplateFormProps {
  mode: "create" | "edit";
  templateId?: string;
  initialValues?: Partial<TemplateFormValues>;
}

const defaultVariables: TemplateVariable[] = [
  { key: "topic", label: "Topic", placeholder: "Example topic", required: true },
];

const emptyForm: TemplateFormValues = {
  title: "",
  slug: "",
  description: "",
  prompt: 'Write content on the topic "{{topic}}".',
  variablesJson: JSON.stringify(defaultVariables, null, 2),
  category: "other",
  requiredPlan: "free",
  isActive: true,
};

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function TemplateForm({ mode, templateId, initialValues }: TemplateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<TemplateFormValues>({
    ...emptyForm,
    ...initialValues,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "title" && mode === "create" && !prev.slug) {
        next.slug = slugifyTitle(String(value));
      }

      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    let variables: TemplateVariable[] = [];

    try {
      variables = JSON.parse(form.variablesJson);
    } catch {
      setError("Invalid JSON in the variables field");
      setIsSubmitting(false);
      return;
    }

    const url =
      mode === "create"
        ? "/api/admin/templates"
        : `/api/admin/templates/${templateId}`;

    const response = await fetch(url, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        variables,
      }),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    router.push("/admin/templates");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Title *
          </label>
          <Input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Slug *
          </label>
          <Input
            value={form.slug}
            onChange={(e) => updateField("slug", e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Description *
        </label>
        <Input
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Category *
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              updateField("category", e.target.value as TemplateCategory)
            }
            className={selectClassName}
          >
            {Object.entries(templateCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Plan *
          </label>
          <select
            value={form.requiredPlan}
            onChange={(e) => updateField("requiredPlan", e.target.value as Plan)}
            className={selectClassName}
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Prompt * (use {"{{variable}}"} for variables)
        </label>
        <Textarea
          value={form.prompt}
          onChange={(e) => updateField("prompt", e.target.value)}
          required
          rows={6}
          className="font-mono"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Variables (JSON) *
        </label>
        <Textarea
          value={form.variablesJson}
          onChange={(e) => updateField("variablesJson", e.target.value)}
          required
          rows={8}
          className="font-mono text-xs"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Format: [{"{"}key, label, placeholder?, required{"}"}]
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => updateField("isActive", e.target.checked)}
          className="accent-primary"
        />
        Active (visible on /templates and /generate)
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create template"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/templates")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}