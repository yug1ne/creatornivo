import Link from "next/link";

import { LibraryGrid } from "@/components/library/library-grid";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  LIBRARY_LIST_LIMIT,
  toLibraryContentPreview,
} from "@/lib/library/list";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await requireSession();

  const [prompts, totalCount] = await Promise.all([
    prisma.savedPrompt.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      take: LIBRARY_LIST_LIMIT,
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
        template: {
          select: { title: true },
        },
      },
    }),
    prisma.savedPrompt.count({ where: { userId: session.id } }),
  ]);

  const items = prompts.map((prompt) => ({
    id: prompt.id,
    title: prompt.title,
    contentPreview: toLibraryContentPreview(prompt.content),
    updatedAt: prompt.updatedAt.toISOString(),
    templateTitle: prompt.template?.title ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Library"
        description="Your saved prompts and generation results"
        action={
          <Link href="/generate" className={buttonVariants()}>
            New generation
          </Link>
        }
      />

      <div data-onboarding="library-content">
        <LibraryGrid
          prompts={items}
          totalCount={totalCount}
          listLimit={LIBRARY_LIST_LIMIT}
        />
      </div>
    </>
  );
}
