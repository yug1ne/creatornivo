import Link from "next/link";

import { LibraryGrid } from "@/components/library/library-grid";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await requireSession();

  const prompts = await prisma.savedPrompt.findMany({
    where: { userId: session.id },
    orderBy: { updatedAt: "desc" },
    include: {
      template: {
        select: { title: true, slug: true },
      },
    },
  });

  const items = prompts.map((prompt) => ({
    id: prompt.id,
    title: prompt.title,
    content: prompt.content,
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
        <LibraryGrid prompts={items} />
      </div>
    </>
  );
}