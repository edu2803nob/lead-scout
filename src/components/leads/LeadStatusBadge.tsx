import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/types/lead";

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-secondary text-secondary-foreground",
  QUALIFIED: "bg-primary/10 text-primary",
  CONTACT_READY: "bg-primary/15 text-primary",
  CONTACTED: "bg-accent/25 text-accent-foreground",
  RESPONDED: "bg-accent/35 text-accent-foreground",
  MEETING: "bg-chart-4/15 text-chart-4",
  PROPOSAL: "bg-chart-4/20 text-chart-4",
  NEGOTIATION: "bg-chart-4/25 text-chart-4",
  WON: "bg-success/15 text-success",
  LOST: "bg-destructive/10 text-destructive",
  NO_INTEREST: "bg-muted text-muted-foreground",
  NO_RESPONSE: "bg-muted text-muted-foreground",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_STYLES[status])}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
