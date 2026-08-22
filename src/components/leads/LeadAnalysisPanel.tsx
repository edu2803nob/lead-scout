import { Brain, Loader2 } from "lucide-react";

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
import { BUSINESS_PROFILE_CONFIG, type BusinessProfile } from "@/config/commercial-analysis";
import { cn } from "@/lib/utils";
import {
  ANALYSIS_STATEMENT_LABELS,
  type AnalysisStatementKind,
  type StoredCommercialAnalysis,
} from "@/types/analysis";

/** Presentation only. The analysis runs exclusively on the user's action. */

const KIND_CLASS: Record<AnalysisStatementKind, string> = {
  FACT: "bg-score-very-high/15 text-score-very-high",
  INFERENCE: "bg-score-medium/15 text-score-medium",
  UNKNOWN: "bg-muted text-muted-foreground",
};

export interface LeadAnalysisPanelProps {
  analysis?: StoredCommercialAnalysis | null | undefined;
  loading: boolean;
  pending: boolean;
  onAnalyze: () => void;
}

export function LeadAnalysisPanel({
  analysis,
  loading,
  pending,
  onAnalyze,
}: LeadAnalysisPanelProps) {
  const profileLabel = analysis?.businessProfile
    ? BUSINESS_PROFILE_CONFIG[analysis.businessProfile as BusinessProfile]?.label
    : undefined;

  return (
    <Card className="shadow-soft md:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4 text-brand" aria-hidden />
            Análise comercial (IA)
          </CardTitle>
          <CardDescription>
            Interpretação dos dados observados, separando fatos, inferências e lacunas.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {analysis ? (
            <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold tabular-nums text-brand">
              {Math.round(analysis.purchasePotential)} · confiança{" "}
              {Math.round(analysis.confidence * 100)}%
            </span>
          ) : null}
          <Button variant="secondary" onClick={onAnalyze} disabled={pending || loading}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Analisando..." : analysis ? "Reanalisar" : "Analisar com IA"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando análise salva...</p>
        ) : !analysis ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma análise ainda. Enriqueça o lead para ter mais evidências e execute a análise
            quando quiser.
          </p>
        ) : (
          <>
            <p className="text-sm">{analysis.summary}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <ListBlock title="Dores identificadas" items={analysis.painPoints} />
              <ListBlock title="Oportunidades" items={analysis.opportunities} />
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted/50 p-3">
                <Label>Oferta recomendada</Label>
                <p className="mt-1 text-sm">{analysis.recommendedOffer}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <Label>Abordagem recomendada</Label>
                <p className="mt-1 text-sm">{analysis.recommendedApproach}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Evidências</Label>
              <ul className="space-y-2">
                {analysis.evidence.map((item, index) => (
                  <li
                    key={`${item.kind}-${index}`}
                    className="flex flex-wrap items-start gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide",
                        KIND_CLASS[item.kind],
                      )}
                    >
                      {ANALYSIS_STATEMENT_LABELS[item.kind]}
                    </span>
                    <span className="text-muted-foreground">{item.statement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Raciocínio</Label>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                {analysis.reasoning.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {profileLabel ? <Badge variant="secondary">{profileLabel}</Badge> : null}
              <span>{analysis.model}</span>
              <span>· atualizada em {new Date(analysis.updatedAt).toLocaleString("pt-BR")}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
