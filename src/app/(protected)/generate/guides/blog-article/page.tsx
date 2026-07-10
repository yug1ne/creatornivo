import type { Metadata } from "next";

import { BlogArticleGuide } from "@/components/generate/blog-article-guide";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Blog Article field guide",
  description:
    "How to fill every Blog Article parameter — what each field means, examples, and what to avoid.",
};

export default async function BlogArticleGuidePage() {
  await requireSession();

  return <BlogArticleGuide />;
}
