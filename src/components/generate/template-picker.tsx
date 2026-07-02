"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  getCategoryColor,
  getCategoryIcon,
  getCategoryLabel,
} from "@/config/template-categories";
import {
  categoryMatchesGroup,
  getGroupsInUse,
  getGroupLabel,
  getTemplateGroup,
  type TemplateGroupId,
} from "@/config/template-groups";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { TemplateListItem } from "@/types/template";

interface TemplatePickerProps {
  templates: TemplateListItem[];
  selectedId: string | null;
  userPlan: "free" | "pro";
  onSelect: (template: TemplateListItem) => void;
}

export function TemplatePicker({
  templates,
  selectedId,
  userPlan,
  onSelect,
}: TemplatePickerProps) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<TemplateGroupId>("all");

  const accessibleCount = templates.filter((t) => !t.isLocked).length;

  const groupsInUse = useMemo(
    () => getGroupsInUse(templates.map((t) => t.category)),
    [templates],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesGroup = categoryMatchesGroup(template.category, group);
      const matchesSearch =
        !query ||
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        getCategoryLabel(template.category).toLowerCase().includes(query) ||
        getGroupLabel(getTemplateGroup(template.category))
          .toLowerCase()
          .includes(query);

      return matchesGroup && matchesSearch;
    });
  }, [templates, search, group]);

  return (
    <div className="space-y-4" data-onboarding="template-picker">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Templates</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {userPlan === "free"
            ? `${accessibleCount} of ${templates.length} available`
            : `${templates.length} templates`}
        </p>
      </div>

      <Input
        type="search"
        placeholder="Search templates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search templates"
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setGroup("all")}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            group === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {groupsInUse.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setGroup(item.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              group === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin max-h-[calc(100vh-20rem)] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-16rem)]">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No templates found
          </p>
        ) : (
          filtered.map((template) => {
            const isSelected = selectedId === template.id;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template)}
                disabled={template.isLocked}
                className={cn(
                  "w-full rounded-[var(--radius-lg)] border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-accent shadow-[var(--shadow-sm)]"
                    : template.isLocked
                      ? "cursor-not-allowed border-border opacity-50"
                      : "border-border hover:border-primary/40 hover:shadow-[var(--shadow-sm)]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
                      getCategoryColor(template.category),
                    )}
                    aria-hidden
                  >
                    {getCategoryIcon(template.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {template.title}
                      </span>
                      <Badge
                        variant={
                          template.requiredPlan === "pro" ? "pro" : "free"
                        }
                      >
                        {template.requiredPlan === "pro" ? "Pro" : "Free"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getGroupLabel(getTemplateGroup(template.category))}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {template.description}
                    </p>
                    {template.isLocked && (
                      <p className="mt-2 text-xs text-warning">
                        <Link
                          href="/pricing"
                          className="underline hover:no-underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Pro required
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}