"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCategoryLabel } from "@/config/template-categories";
import type { Plan } from "@/config/plans";
import type { TemplateCategory } from "@/types/template";

interface AdminTemplateRow {
  id: string;
  slug: string;
  title: string;
  category: TemplateCategory;
  requiredPlan: Plan;
  isActive: boolean;
  updatedAt: string;
}

interface TemplatesTableProps {
  templates: AdminTemplateRow[];
}

export function TemplatesTable({ templates }: TemplatesTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete template "${title}"?`)) return;

    setError("");
    setDeletingId(id);

    const response = await fetch(`/api/admin/templates/${id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to delete");
      return;
    }

    router.refresh();
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates yet.{" "}
        <Link href="/admin/templates/new" className="text-primary underline">
          Create the first one
        </Link>
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {template.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {template.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getCategoryLabel(template.category)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        template.requiredPlan === "pro" ? "pro" : "free"
                      }
                    >
                      {template.requiredPlan}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={template.isActive ? "success" : "outline"}
                    >
                      {template.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleDateString("en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/templates/${template.id}/edit`}
                        className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        Edit
                      </Link>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleDelete(template.id, template.title)
                        }
                        disabled={deletingId === template.id}
                      >
                        {deletingId === template.id ? "..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}