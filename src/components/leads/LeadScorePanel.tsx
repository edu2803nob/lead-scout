import { Gauge, Loader2, Minus, TrendingDown, TrendingUp } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScoreBadge,
  Separator,
} from "@/components/ds";
import { SCORE_DIMENSION_LABELS, SCORE_WEIGHTS, type ScoreDimension } from "@/config/scoring";
import { cn } from "@/lib/utils";
import type { LeadScoreResult, ScoreFactorImpact } from "@/types/scoring";

/** Presentation only: all numbers come from the deterministic engine. */

const IMPACT_ICON: Record<ScoreFactorImpact, typeof TrendingUp> = {
  POSITIVE: TrendingUp,
  NEGATIVE: TrendingDown,
  NEUTRAL: Minus,
};

const IMPACT_CLASS: Record<ScoreFactorImpact, string> = {
  POSITIVE: "text-score-very-high",
  NEGATIVE: "text-score-low",
  NEUTRAL: "text-muted-foreground",
};

export interface LeadScorePanelProps {
  result?: LeadScoreResult | undefined;
  pending: boolean;
  onCalculate: () => void;
}

export function LeadScorePanel({ result, pending, onCalculate }: LeadScorePanelProps) {
  const dimensions: Array<{ dimension: ScoreDimension; value: number }> = result
    ? [
        { dimension: "DIGITAL_PRESENCE", value: result.digitalPresenceScore },
        { dimension: "AUDIENCE", value: result.audienceScore },
        { dimension: "REPUTATION", value: result.reputationScore },
        { dimension: "COMMERCIAL_POTENTIAL", value: result.commercialPotentialScore },
        { dimension: "CONVERSION_OPPORTUNITY", value: result.conversionOpportunityScore },
      ]
    : [];

  return (
    <Card className="shadow-soft md:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="size-4 text-brand" aria-hidden />
            Lead Score
          </CardTitle>
          <CardDescription>
            Cálculo determinístico por dimensões com pesos configuráveis.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge score={result?.totalScore ?? null} />
          <Button variant="secondary" onClick={onCalculate} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Calculando..." : "Calcular score"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!result ? (
          <p className="text-sm text-muted-foreground">
            Nenhum score calculado ainda. Enriqueça o lead e calcule o score para priorizar.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {dimensions.map(({ dimension, value }) => (
                <div key={dimension} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{SCORE_DIMENSION_LABELS[dimension]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {value} · peso {Math.round(SCORE_WEIGHTS[dimension] * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Fatores considerados
              </p>
              <ul className="space-y-2">
                {result.factors.map((factor) => {
                  const Icon = IMPACT_ICON[factor.impact];
                  return (
                    <li key={`${factor.dimension}-${factor.code}`} className="flex gap-2">
                      <Icon
                        className={cn("mt-0.5 size-4 shrink-0", IMPACT_CLASS[factor.impact])}
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {factor.label}
                          <span className="ml-1 text-xs font-normal text-muted-foreground tabular-nums">
                            ({factor.points > 0 ? "+" : ""}
                            {factor.points} em {SCORE_DIMENSION_LABELS[factor.dimension]})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{factor.explanation}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
