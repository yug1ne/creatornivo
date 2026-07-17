"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

interface TemplatesGridProps {
  templates: TemplateCatalogItem[];
}

export function TemplatesGrid({ templates }: TemplatesGridProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<TemplateGroupId>("all");

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

  const freeCount = templates.filter((t) => t.requiredPlan === "free").length;
  const proCount = templates.filter((t) => t.requiredPlan === "pro").length;

  function goToPricing() {
    router.push("/pricing");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md flex-1">
          <Input
            type="search"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search templates"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {templates.length} templates · {freeCount} free · {proCount} Pro
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGroup("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
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
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              group === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No templates match your search
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const isLocked = template.isLocked;

            const card = (
              <Card
                hover={!isLocked}
                role={isLocked ? "button" : undefined}
                tabIndex={isLocked ? 0 : undefined}
                onClick={isLocked ? goToPricing : undefined}
                onKeyDown={
                  isLocked
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          goToPricing();
                        }
                      }
                    : undefined
                }
                className={cn(
                  "flex flex-col transition-all",
                  isLocked &&
                    "cursor-pointer bg-muted/30 opacity-70 hover:border-primary/30 hover:opacity-90",
                )}
              >
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
                        getCategoryColor(template.category),
                        isLocked && "opacity-60",
                      )}
                      aria-hidden
                    >
                      {getCategoryIcon(template.category)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                          {isLocked && <LockIcon />}
                          <span className="truncate">{template.title}</span>
                        </h3>
                        <Badge
                          variant={
                            template.requiredPlan === "pro" ? "pro" : "free"
                          }
                        >
                          {template.requiredPlan === "pro" ? "Pro" : "Free"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getCategoryLabel(template.category)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>

                  {template.variableCount > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {template.variableCount} variable
                      {template.variableCount === 1 ? "" : "s"}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="border-t border-border p-5 pt-4">
                  {isLocked ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      Upgrade to unlock →
                    </span>
                  ) : (
                    <Link
                      href={`/generate?template=${template.slug}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Use template →
                    </Link>
                  )}
                </CardFooter>
              </Card>
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
          })}
        </div>
      )}
    </div>
  );
}