import { Link } from "@tanstack/react-router";
import { Globe2, MapPin, Phone, Trash2 } from "lucide-react";

import { ScoreBadge } from "@/components/ds/ScoreBadge";
import { StatusBadge } from "@/components/ds/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/lead";

export interface LeadCardProps {
  lead: Lead & { score?: number | null };
  onDelete?: (id: string) => void;
  className?: string;
}

export function LeadCard({ lead, onDelete, className }: LeadCardProps) {
  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-raised",
        className,
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <Link
            to="/leads/$leadId"
            params={{ leadId: lead.id }}
            className="block truncate font-display text-base font-semibold text-foreground hover:text-primary"
          >
            {lead.companyName}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {lead.businessCategory ?? "Sem categoria"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={lead.status} size="sm" />
          {onDelete ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onDelete(lead.id)}
              aria-label={`Excluir ${lead.companyName}`}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{lead.city ?? "Cidade não informada"}</span>
        </div>
        {lead.phone ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Phone className="size-3.5 shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Globe2 className="size-3.5 shrink-0" />
          <span>{lead.hasWebsite ? "Com site" : "Sem site"}</span>
        </div>
      </dl>

      {lead.score !== undefined ? (
        <div className="mt-3">
          <ScoreBadge score={lead.score} size="sm" />
        </div>
      ) : null}
    </article>
  );
}
