import { Badge } from "@/components/ui";
import type { DisplayStatus } from "@/lib/cms/types";

const MAP: Record<DisplayStatus, [string, "positive" | "warning" | "stale" | "neutral"]> = {
  live: ["Live", "positive"], draft: ["Draft", "neutral"], scheduled: ["Scheduled", "warning"], expired: ["Expired", "stale"],
  pending: ["Pending approval", "warning"], archived: ["Archived", "neutral"], deleted: ["Deleted", "stale"], default: ["Built-in text", "neutral"],
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const [label, tone] = MAP[status];
  return <Badge tone={tone}>{label}</Badge>;
}
