"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface LibraryPromptItem {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  templateTitle: string | null;
}

interface LibraryGridProps {
  prompts: LibraryPromptItem[];
}

type SortOption = "newest" | "oldest" | "title";

export function LibraryGrid({ prompts }: LibraryGridProps) {
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("newest");

  const templateOptions = useMemo(() => {
    const titles = new Set<string>();
    for (const prompt of prompts) {
      if (prompt.templateTitle) titles.add(prompt.templateTitle);
    }
    return Array.from(titles).sort();
  }, [prompts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = prompts.filter((prompt) => {
      const matchesTemplate =
        templateFilter === "all" || prompt.templateTitle === templateFilter;
      const matchesSearch =
        !query ||
        prompt.title.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        (prompt.templateTitle?.toLowerCase().includes(query) ?? false);

      return matchesTemplate && matchesSearch;
    });

    result = [...result].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "en");
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [prompts, search, templateFilter, sort]);

  if (prompts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground">
            ▤
          </span>
          <p className="text-sm font-medium text-foreground">Library is empty</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Generate content and save the result for it to appear here
          </p>
          <Link href="/generate" className={buttonVariants({ className: "mt-6" })}>
            Go to generation
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search by title or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          aria-label="Search in library"
        />

        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          className="h-10 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by template"
        >
          <option value="all">All templates</option>
          {templateOptions.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="h-10 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Sort"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">By title</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {prompts.length} prompts
      </p>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nothing found. Try changing filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((prompt) => (
            <Link key={prompt.id} href={`/library/${prompt.id}`}>
              <Card hover className="h-full">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-semibold text-foreground">
                      {prompt.title}
                    </h3>
                    <span className="shrink-0 text-muted-foreground" aria-hidden>
                      →
                    </span>
                  </div>

                  {prompt.templateTitle && (
                    <Badge variant="outline" className="mt-2 w-fit">
                      {prompt.templateTitle}
                    </Badge>
                  )}

                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {prompt.content}
                  </p>

                  <p className="mt-4 text-xs text-muted-foreground">
                    {new Date(prompt.updatedAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}