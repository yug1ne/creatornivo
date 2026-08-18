"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getCategoryColor,
  getCategoryIcon,
  getCategoryLabel,
} from "@/config/template-categories";
import type { TemplateGroupId } from "@/config/template-groups";
import {
  filterPublicTools,
  getPublicToolGroupsInUse,
  getPublicToolHref,
  type PublicToolCatalogItem,
} from "@/lib/seo/public-tool-catalog";
import { cn } from "@/lib/utils/cn";

type ToolsCatalogProps = {
  tools: PublicToolCatalogItem[];
};

export function ToolsCatalog({ tools }: ToolsCatalogProps) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<TemplateGroupId>("all");

  const groupsInUse = useMemo(
    () => getPublicToolGroupsInUse(tools),
    [tools],
  );

  const visibleSlugs = useMemo(() => {
    return new Set(
      filterPublicTools(tools, search, group).map((tool) => tool.slug),
    );
  }, [tools, search, group]);

  const visibleCount = visibleSlugs.size;
  const freeCount = tools.filter((tool) => tool.requiredPlan === "free").length;
  const proCount = tools.filter((tool) => tool.requiredPlan === "pro").length;

  return (
    <div className="mt-10 space-y-6 sm:mt-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 w-full max-w-md flex-1">
          <label htmlFor={searchId} className="sr-only">
            Search tools
          </label>
          <Input
            id={searchId}
            type="search"
            placeholder="Search tools..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
          />
        </div>
        <p
          className="text-sm text-muted-foreground"
          aria-live="polite"
        >
          {visibleCount === tools.length
            ? `${tools.length} tools · ${freeCount} free · ${proCount} Pro`
            : `${visibleCount} of ${tools.length} tools`}
        </p>
      </div>

      <div
        role="group"
        aria-label="Filter by category"
        className="flex flex-wrap gap-2"
      >
        <CategoryChip
          label="All"
          selected={group === "all"}
          onSelect={() => setGroup("all")}
        />
        {groupsInUse.map((item) => (
          <CategoryChip
            key={item.id}
            label={item.label}
            selected={group === item.id}
            onSelect={() => setGroup(item.id)}
          />
        ))}
      </div>

      {visibleCount === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No tools match your search
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const hidden = !visibleSlugs.has(tool.slug);

          return (
            <article
              key={tool.slug}
              className={cn("min-w-0", hidden && "hidden")}
              aria-hidden={hidden || undefined}
            >
              <Link
                href={getPublicToolHref(tool.slug)}
                className="block h-full rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card hover className="h-full">
                  <CardContent className="flex h-full flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
                          getCategoryColor(tool.category),
                        )}
                        aria-hidden
                      >
                        {getCategoryIcon(tool.category)}
                      </span>
                      <Badge
                        variant={
                          tool.requiredPlan === "pro" ? "pro" : "free"
                        }
                      >
                        {tool.requiredPlan === "pro" ? "Pro" : "Free"}
                      </Badge>
                    </div>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {tool.platform}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                      {tool.h1}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getCategoryLabel(tool.category)}
                    </p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {tool.subheading}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "min-h-9 rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
