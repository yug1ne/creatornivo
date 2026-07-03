import Link from "next/link";

import { earlyAccessConfig } from "@/config/early-access";
import { getEarlyAccessStatus } from "@/lib/early-access/status";

export async function EarlyAccessBanner() {
  const status = await getEarlyAccessStatus();

  if (!status.isAvailable) {
    return null;
  }

  return (
    <div className="border-b border-primary/20 bg-primary/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center text-sm sm:px-6">
        <p className="min-w-0 break-words font-medium text-foreground">
          <span className="text-primary">{earlyAccessConfig.bannerText}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span>
            Pro for {status.price}/mo
            <span className="ml-1 text-muted-foreground line-through">
              {status.regularPrice}
            </span>
          </span>
        </p>
        <Link
          href="/#pricing"
          className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
        >
          View pricing →
        </Link>
      </div>
    </div>
  );
}
