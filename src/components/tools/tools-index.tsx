import Link from "next/link";

import { ToolsCatalog } from "@/components/tools/tools-catalog";
import { ToolsIndexJsonLd } from "@/components/tools/tool-json-ld";
import { listPublicTools, publicToolsIndex } from "@/config/public-tools";
import { toPublicToolCatalogItems } from "@/lib/seo/public-tool-catalog";

export function ToolsIndex() {
  const tools = toPublicToolCatalogItems(listPublicTools());

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24">
      <ToolsIndexJsonLd />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/"
              className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground">Tools</li>
        </ol>
      </nav>

      <div className="mx-auto mt-8 max-w-2xl text-center sm:mt-10">
        <p className="text-sm font-medium text-primary">Public templates</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight break-words text-foreground sm:text-4xl">
          {publicToolsIndex.h1}
        </h1>
        <p className="mt-4 text-muted-foreground">{publicToolsIndex.intro}</p>
      </div>

      <ToolsCatalog tools={tools} />
    </section>
  );
}
