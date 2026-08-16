import type { SessionUser } from "@/types";
import { getPlanLimits } from "@/config/plans";

export const EXPORT_UPGRADE_MESSAGE =
  "Export is available on the Pro plan. Upgrade to Pro to download content as .md and .txt.";

export function canExportContent(
  session: SessionUser | null,
  access?: { canExport: boolean } | null,
): boolean {
  if (!session) return false;
  if (access) return access.canExport;
  return getPlanLimits(session.plan).canExport;
}