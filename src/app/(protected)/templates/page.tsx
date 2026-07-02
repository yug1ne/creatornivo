import Link from "next/link";

import { TemplatesGrid } from "@/components/templates/templates-grid";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getTemplatesForUser } from "@/lib/templates/queries";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await getSession();
  const templates = await getTemplatesForUser(session);

  return (
    <>
      <PageHeader
        title="Templates"
        description="Browse battle-tested prompts across social, email, marketing, SEO, video, and more"
        action={
          <Link href="/generate" className={buttonVariants()}>
            Start generating
          </Link>
        }
      />

      <div data-onboarding="templates-grid">
        <TemplatesGrid templates={templates} />
      </div>
    </>
  );
}