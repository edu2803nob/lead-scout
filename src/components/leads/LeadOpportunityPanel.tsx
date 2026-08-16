import { Lightbulb, Loader2 } from "lucide-react";

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
import { OPPORTUNITY_TYPE_LABELS, OPPORTUNITY_WEIGHTS } from "@/config/opportunity";
import { cn } from "@/lib/utils";
import type { LandingPageOpportunityResult } from "@/types/opportunity";

/** Presentation only: every number comes from the deterministic engine. */

const LEVEL_CLASS: Record<LandingPageOpportunityResult["level"], string> = {
  VERY_HIGH: "bg-score-very-high/15 text-score-very-high",
  HIGH: "bg-score-high/15 text-score-high",
  MEDIUM: "bg-score-medium/15 text-score-medium",
  LOW: "bg-score-low/15 text-score-low",
};

const LEVEL_LABEL: Record<LandingPageOpportunityResult["level"], string> = {
  VERY_HIGH: "Muito alta",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export interface LeadOpportunityPanelProps {
  result?: LandingPageOpportunityResult | undefined;
  pending: boolean;
  onAnalyze: () => void;
}

export function LeadOpportunityPanel({ result, pending, onAnalyze }: LeadOpportunityPanelProps) {
  const dimensions = result
    ? [
        { label: "Lacuna digital", value: result.gapScore, weight: OPPORTUNITY_WEIGHTS.gap },
        { label: "Demanda existente", value: result.demandScore, weight: OPPORTUNITY_WEIGHTS.demand },
        { label: "Aderência do modelo", value: result.fitScore, weight: OPPORTUNITY_WEIGHTS.fit },
        { label: "Canais de conversão", value: result.channelScore, weight: OPPORTUNITY_WEIGHTS.channel },
      ]
    : [];

  return (
    <Card className="shadow-soft md:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-brand" aria-hidden />
            Landing Page Opportunity
          </CardTitle>
          <CardDescription>
            Quanto uma landing page é solução adequada para este negócio, com base em evidências.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {result ? (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-semibold tabular-nums",
                LEVEL_CLASS[result.level],
              )}
            >
              {result.opportunityScore} · {LEVEL_LABEL[result.level]}
            </span>
          ) : null}
          <Button variant="secondary" onClick={onAnalyze} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Analisando..." : "Analisar oportunidade"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!result ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma análise ainda. Enriqueça o lead para obter evidências e depois analise a
            oportunidade de landing page.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {dimensions.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {item.value} · peso {Math.round(item.weight * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tipos de oportunidade
              </p>
              {result.opportunityTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem evidências suficientes para apontar um tipo de oportunidade.
                </p>
              ) : (
                <ul className="space-y-2">
                  {result.opportunityTypes.map((item) => (
                    <li key={item.type} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {OPPORTUNITY_TYPE_LABELS[item.type]}
                        </span>
                        <Badge variant="secondary" className="tabular-nums">
                          {item.score}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evidências
              </p>
              <ul className="space-y-1">
                {result.evidence.map((item) => (
                  <li key={item.code} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{item.label}</span> — {item.detail}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Solução recomendada
              </p>
              <p className="mt-1">{result.recommendedSolution}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
