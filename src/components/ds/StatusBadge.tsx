import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/types/lead";

/** Single source of truth for lead status colors. */
export const LEAD_STATUS_CLASSES: Record<LeadStatus, string> = {
  NEW: "bg-secondary text-secondary-foreground ring-border",
  QUALIFIED: "bg-primary/10 text-primary ring-primary/20",
  CONTACT_READY: "bg-primary/15 text-primary ring-primary/25",
  CONTACTED: "bg-info/12 text-info ring-info/25",
  RESPONDED: "bg-info/18 text-info ring-info/30",
  MEETING: "bg-warning/20 text-warning-foreground ring-warning/30",
  PROPOSAL: "bg-warning/25 text-warning-foreground ring-warning/35",
  NEGOTIATION: "bg-accent/30 text-accent-foreground ring-accent/40",
  WON: "bg-success/15 text-success ring-success/25",
  LOST: "bg-destructive/10 text-destructive ring-destructive/20",
  NO_INTEREST: "bg-muted text-muted-foreground ring-border",
  NO_RESPONSE: "bg-muted text-muted-foreground ring-border",
};

export interface StatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        LEAD_STATUS_CLASSES[status],
        className,
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
