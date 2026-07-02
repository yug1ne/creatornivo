import type { SessionUser } from "@/types";
import { getPlanLimits } from "@/config/plans";

export const EXPORT_UPGRADE_MESSAGE =
  "Export is available on the Pro plan. Upgrade to Pro to download content as .md and .txt.";

export function canExportContent(session: SessionUser | null): boolean {
  if (!session) return false;
  return getPlanLimits(session.plan).canExport;
}