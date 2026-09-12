import { BadgeDollarSign, Loader2 } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@/components/ds";
import {
  AUDIT_PROBLEM_AREA_LABELS,
  AUDIT_SECTION_LABELS,
  AUDIT_SEVERITY_LABELS,
  type AuditSeverity,
} from "@/config/digital-audit";
import { OFFER_TYPE_LABELS } from "@/config/offer";
import { cn } from "@/lib/utils";
import type { StoredOfferRecommendation } from "@/types/offer";

/** Presentation only. The recommendation runs exclusively on the user's action. */

const SEVERITY_CLASS: Record<AuditSeverity, string> = {
  HIGH: "bg-score-low/15 text-score-low",
  MEDIUM: "bg-score-medium/15 text-score-medium",
  LOW: "bg-muted text-muted-foreground",
};

export interface LeadOfferPanelProps {
  offer?: StoredOfferRecommendation | null | undefined;
  loading: boolean;
  pending: boolean;
  onRecommend: () => void;
}

export function LeadOfferPanel({ offer, loading, pending, onRecommend }: LeadOfferPanelProps) {
  return (
    <Card className="shadow-soft md:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeDollarSign className="size-4 text-brand" aria-hidden />
            Recomendação de oferta
          </CardTitle>
          <CardDescription>
            Qual solução de landing page oferecer, sempre ligada a um problema comercial
            identificado.
          </CardDescription>
        </div>
        <Button variant="secondary" onClick={onRecommend} disabled={pending || loading}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Definindo oferta..." : offer ? "Recalcular oferta" : "Recomendar oferta"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando oferta salva...</p>
        ) : !offer ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma oferta definida. Execute a auditoria digital ou a análise comercial primeiro — a
            oferta precisa de um problema comercial identificado.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{OFFER_TYPE_LABELS[offer.offerType]}</Badge>
              {offer.secondaryOfferType ? (
                <Badge variant="secondary">{OFFER_TYPE_LABELS[offer.secondaryOfferType]}</Badge>
              ) : null}
            </div>

            <div>
              <p className="text-base font-semibold text-foreground">{offer.offerTitle}</p>
              <p className="text-sm text-muted-foreground">{offer.valueProposition}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Objetivo principal" value={offer.mainObjective} />
              <Info label="Estratégia de conversão" value={offer.conversionStrategy} />
              <Info label="CTA principal" value={offer.primaryCTA} />
              <Info label="CTA secundário" value={offer.secondaryCTA ?? "—"} />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Seções recomendadas
                </h3>
                {offer.recommendedSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma seção com justificativa nos dados observados.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {offer.recommendedSections.map((item) => (
                      <li key={item.section} className="text-sm">
                        <Badge variant="secondary">{AUDIT_SECTION_LABELS[item.section]}</Badge>
                        <p className="mt-1 text-muted-foreground">{item.justification}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Problemas que a oferta resolve
                </h3>
                <ul className="space-y-2">
                  {offer.linkedProblems.map((item, index) => (
                    <li key={`${item.area}-${index}`} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{AUDIT_PROBLEM_AREA_LABELS[item.area]}</Badge>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            SEVERITY_CLASS[item.severity],
                          )}
                        >
                          {AUDIT_SEVERITY_LABELS[item.severity]}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{item.problem}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
