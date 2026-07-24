import { Badge } from "@/components/ui/badge";
import {
  SUPPORT_STATUS_LABELS,
  type SupportThreadStatusValue,
} from "@/config/support";

export function SupportStatusBadge({
  status,
}: {
  status: SupportThreadStatusValue | string;
}) {
  const label =
    SUPPORT_STATUS_LABELS[status as SupportThreadStatusValue] ?? status;

  const variant =
    status === "closed"
      ? "outline"
      : status === "answered"
        ? "success"
        : "default";

  return <Badge variant={variant}>{label}</Badge>;
}
