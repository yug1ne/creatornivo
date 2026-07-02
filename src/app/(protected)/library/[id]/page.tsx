import Link from "next/link";
import { notFound } from "next/navigation";

import { ExportButtons } from "@/components/export/export-buttons";
import { CopyContentButton } from "@/components/library/copy-content-button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { canExportContent } from "@/lib/export/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface LibraryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LibraryDetailPage({
  params,
}: LibraryDetailPageProps) {
  const { id } = await params;
  const session = await requireSession();

  const prompt = await prisma.savedPrompt.findFirst({
    where: { id, userId: session.id },
    include: {
      template: {
        select: { title: true, slug: true },
      },
    },
  });

  if (!prompt) {
    notFound();
  }

  const canExport = canExportContent(session);

  return (
    <>
      <PageHeader
        title={prompt.title}
        description={
          prompt.template
            ? `Template: ${prompt.template.title}`
            : "Saved prompt"
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CopyContentButton content={prompt.content} />
            <ExportButtons
              canExport={canExport}
              title={prompt.title}
              promptId={prompt.id}
              size="md"
            />
            <Link
              href="/library"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              ← Library
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          Saved{" "}
          {prompt.createdAt.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {prompt.template && (
          <>
            <span aria-hidden>·</span>
            <Badge variant="outline">{prompt.template.title}</Badge>
            <Link
              href={`/generate?template=${prompt.template.slug}`}
              className="font-medium text-primary hover:underline"
            >
              Generate again
            </Link>
          </>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="scrollbar-thin max-h-[70vh] overflow-y-auto p-0">
          <div className="px-6 py-6">
            <MarkdownContent content={prompt.content} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}