import Link from "next/link";

import { TemplatesGrid } from "@/components/templates/templates-grid";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getTemplatesForUser } from "@/lib/templates/queries";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await getSession();
  // Catalog grid only needs metadata — never full prompts.
  const templates = await getTemplatesForUser(session, { includePrompt: false });

  return (
    <>
      <PageHeader
        title="Templates"
        description="Browse 45 structured templates across social, email, marketing, SEO, video, e-commerce, launch, and more"
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
