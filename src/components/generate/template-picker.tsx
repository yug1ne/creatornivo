"use client";

import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";

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
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import type { TemplateCatalogItem } from "@/types/template";

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted-foreground"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

interface TemplatePickerProps {
  templates: TemplateCatalogItem[];
  selectedId: string | null;
  userPlan: "free" | "pro";
  onSelect: (template: TemplateCatalogItem) => void;
}

export const TemplatePicker = memo(function TemplatePicker({
  templates,
  selectedId,
  userPlan,
  onSelect,
}: TemplatePickerProps) {
  const router = useRouter();
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
            const isLocked = template.isLocked;

            const card = (
              <button
                type="button"
                onClick={() =>
                  isLocked ? router.push("/pricing") : onSelect(template)
                }
                className={cn(
                  "w-full rounded-[var(--radius-lg)] border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-accent shadow-[var(--shadow-sm)]"
                    : isLocked
                      ? "cursor-pointer border-border bg-muted/30 opacity-70 hover:border-primary/30 hover:opacity-90"
                      : "border-border hover:border-primary/40 hover:shadow-[var(--shadow-sm)]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
                      getCategoryColor(template.category),
                      isLocked && "opacity-60",
                    )}
                    aria-hidden
                  >
                    {getCategoryIcon(template.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-foreground">
                        {isLocked && <LockIcon />}
                        <span className="truncate">{template.title}</span>
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
                  </div>
                </div>
              </button>
            );

            if (!isLocked) {
              return <div key={template.id}>{card}</div>;
            }

            return (
              <Tooltip
                key={template.id}
                content="Pro template – upgrade to unlock"
              >
                {card}
              </Tooltip>
            );
          })
        )}
      </div>
    </div>
  );
});