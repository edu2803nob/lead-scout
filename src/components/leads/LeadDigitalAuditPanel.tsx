import { Loader2, ScanSearch } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { ANALYSIS_STATEMENT_LABELS, type AnalysisStatementKind } from "@/types/analysis";
import type { StoredDigitalAudit } from "@/types/audit";

/** Presentation only. The audit runs exclusively on the user's action. */

const SEVERITY_CLASS: Record<AuditSeverity, string> = {
  HIGH: "bg-score-low/15 text-score-low",
  MEDIUM: "bg-score-medium/15 text-score-medium",
  LOW: "bg-muted text-muted-foreground",
};

const KIND_CLASS: Record<AnalysisStatementKind, string> = {
  FACT: "bg-score-very-high/15 text-score-very-high",
  INFERENCE: "bg-score-medium/15 text-score-medium",
  UNKNOWN: "bg-muted text-muted-foreground",
};

export interface LeadDigitalAuditPanelProps {
  audit?: StoredDigitalAudit | null | undefined;
  loading: boolean;
  pending: boolean;
  onAudit: () => void;
}

export function LeadDigitalAuditPanel({
  audit,
  loading,
  pending,
  onAudit,
}: LeadDigitalAuditPanelProps) {
  return (
    <Card className="shadow-soft md:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanSearch className="size-4 text-brand" aria-hidden />
            Auditoria digital inteligente
          </CardTitle>
          <CardDescription>
            Problemas de presença digital e conversão que justificam uma landing page.
          </CardDescription>
        </div>
        <Button variant="secondary" onClick={onAudit} disabled={pending || loading}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Auditando..." : audit ? "Reauditar" : "Auditar presença digital"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando auditoria salva...</p>
        ) : !audit ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma auditoria ainda. Enriqueça o lead para ter mais evidências e execute a auditoria
            quando quiser.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Presença digital" value={audit.digitalPresenceScore} />
              <Metric label="Oportunidade de conversão" value={audit.conversionOpportunity} />
              <Metric label="Landing page" value={audit.landingPageOpportunity} />
            </div>

            <p className="text-sm">{audit.auditSummary}</p>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Problemas de conversão
                </h3>
                {audit.conversionProblems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum problema observado nos dados disponíveis.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {audit.conversionProblems.map((item, index) => (
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
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Seções recomendadas
                </h3>
                {audit.recommendedSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma seção com justificativa nos dados observados.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {audit.recommendedSections.map((item) => (
                      <li key={item.section} className="text-sm">
                        <Badge variant="secondary">{AUDIT_SECTION_LABELS[item.section]}</Badge>
                        <p className="mt-1 text-muted-foreground">{item.justification}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evidências
              </h3>
              <ul className="space-y-2">
                {audit.evidence.map((item, index) => (
                  <li key={`${item.kind}-${index}`} className="flex flex-wrap items-start gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        KIND_CLASS[item.kind],
                      )}
                    >
                      {ANALYSIS_STATEMENT_LABELS[item.kind]}
                    </span>
                    <span className="text-sm text-muted-foreground">{item.statement}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
