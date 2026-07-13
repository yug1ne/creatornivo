"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  groupTemplateVariables,
  isTemplateFieldVisible,
} from "@/lib/templates/utils";
import type { TemplateVariable } from "@/types/template";
import { cn } from "@/lib/utils/cn";

interface TemplateParametersFormProps {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Group ids that start expanded. When omitted, essentials + first group open. */
  defaultOpenGroups?: string[];
  toolbarAction?: ReactNode;
  toolbarEndAction?: ReactNode;
}

function FieldControl({
  variable,
  value,
  onChange,
}: {
  variable: TemplateVariable;
  value: string;
  onChange: (value: string) => void;
}) {
  const type = variable.type ?? "text";
  const commonId = variable.key;

  if (type === "select" && variable.options?.length) {
    return (
      <Select
        id={commonId}
        value={value}
        options={variable.options}
        emptyLabel="— Leave blank —"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "textarea") {
    return (
      <Textarea
        id={commonId}
        value={value}
        rows={3}
        maxLength={variable.maxLength}
        placeholder={variable.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "number") {
    return (
      <Input
        id={commonId}
        type="number"
        value={value}
        min={variable.min}
        max={variable.max}
        placeholder={variable.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      id={commonId}
      type={variable.format === "url" ? "url" : "text"}
      value={value}
      maxLength={variable.maxLength}
      placeholder={variable.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TemplateParametersForm({
  variables,
  values,
  onChange,
  defaultOpenGroups,
  toolbarAction,
  toolbarEndAction,
}: TemplateParametersFormProps) {
  const groups = useMemo(
    () => groupTemplateVariables(variables),
    [variables],
  );

  const initialOpen = useMemo(() => {
    if (defaultOpenGroups?.length) {
      return new Set(defaultOpenGroups);
    }
    const set = new Set<string>();
    for (const g of groups) {
      if (g.groupId === "essentials") set.add(g.groupId);
      // Open groups that contain required fields
      if (g.variables.some((v) => v.required)) set.add(g.groupId);
    }
    if (set.size === 0 && groups[0]) set.add(groups[0].groupId);
    return set;
  }, [groups, defaultOpenGroups]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setOpenGroups(new Set(groups.map((g) => g.groupId)));
  };

  const collapseOptional = () => {
    const next = new Set<string>();
    for (const g of groups) {
      if (g.groupId === "essentials" || g.variables.some((v) => v.required)) {
        next.add(g.groupId);
      }
    }
    setOpenGroups(next);
  };

  if (variables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This template has no parameters.
      </p>
    );
  }

  const visibleVariables = variables.filter((v) =>
    isTemplateFieldVisible(v, values),
  );
  const hasGroups = groups.length > 1 || groups[0]?.groupId !== "parameters";
  const fieldSummary = (
    <span className="text-muted-foreground">
      {variables.filter((v) => v.required).length} required ·{" "}
      {visibleVariables.length} fields shown
      {visibleVariables.length !== variables.length
        ? ` (${variables.length} total)`
        : ""}
    </span>
  );

  if (!hasGroups) {
    return (
      <div className="space-y-3">
        <TemplateParametersToolbar
          fieldSummary={fieldSummary}
          toolbarAction={toolbarAction}
          toolbarEndAction={toolbarEndAction}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleVariables.map((variable) => (
            <FieldBlock
              key={variable.key}
              variable={variable}
              value={values[variable.key] ?? ""}
              onChange={(v) => onChange(variable.key, v)}
              wide={
                variable.fullWidth ||
                variable.type === "textarea" ||
                (visibleVariables.length % 2 !== 0 &&
                  variable.key === visibleVariables.at(-1)?.key)
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={expandAll}
          className="rounded-md border border-border px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseOptional}
          className="rounded-md border border-border px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Essentials only
        </button>
        {toolbarAction}
        <span className="text-muted-foreground">
          {variables.filter((v) => v.required).length} required ·{" "}
          {visibleVariables.length} fields shown
          {visibleVariables.length !== variables.length
            ? ` (${variables.length} total)`
            : ""}
        </span>
        {toolbarEndAction}
      </div>

      {groups.map((group) => {
        const visibleInGroup = group.variables.filter((v) =>
          isTemplateFieldVisible(v, values),
        );
        if (visibleInGroup.length === 0) return null;

        const isOpen = openGroups.has(group.groupId);
        const requiredCount = visibleInGroup.filter((v) => v.required).length;
        const filledCount = visibleInGroup.filter(
          (v) => values[v.key]?.trim(),
        ).length;

        return (
          <div
            key={group.groupId}
            className="overflow-hidden rounded-[var(--radius-md)] border border-border"
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.groupId)}
              className="flex w-full items-center justify-between gap-3 bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/70"
              aria-expanded={isOpen}
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {group.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {filledCount}/{visibleInGroup.length} filled
                  {requiredCount > 0 ? ` · ${requiredCount} required` : ""}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              >
                ▾
              </span>
            </button>

            {isOpen && (
              <div className="grid gap-4 border-t border-border p-3 sm:grid-cols-2">
                {visibleInGroup.map((variable) => (
                  <FieldBlock
                    key={variable.key}
                    variable={variable}
                    value={values[variable.key] ?? ""}
                    onChange={(v) => onChange(variable.key, v)}
                    wide={
                      variable.fullWidth || variable.type === "textarea"
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TemplateParametersToolbar({
  fieldSummary,
  toolbarAction,
  toolbarEndAction,
}: {
  fieldSummary: ReactNode;
  toolbarAction?: ReactNode;
  toolbarEndAction?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {toolbarAction}
      {fieldSummary}
      {toolbarEndAction}
    </div>
  );
}

function FieldBlock({
  variable,
  value,
  onChange,
  wide,
}: {
  variable: TemplateVariable;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <label
        htmlFor={variable.key}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {variable.label}
        {variable.required && (
          <span className="text-destructive"> *</span>
        )}
      </label>
      <FieldControl
        variable={variable}
        value={value}
        onChange={onChange}
      />
      {variable.hint && (
        <p className="mt-1 text-xs text-muted-foreground">{variable.hint}</p>
      )}
    </div>
  );
}
