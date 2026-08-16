/**
 * Score presentation rules (visual layer only — no business logic).
 *
 * 80-100 = muito alto | 60-79 = alto | 40-59 = médio | 0-39 = baixo
 */

export const SCORE_BANDS = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"] as const;

export type ScoreBand = (typeof SCORE_BANDS)[number];

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  VERY_HIGH: "Muito alto",
  HIGH: "Alto",
  MEDIUM: "Médio",
  LOW: "Baixo",
};

/** Tailwind classes per band, all built from semantic tokens. */
export const SCORE_BAND_CLASSES: Record<ScoreBand, string> = {
  VERY_HIGH: "bg-score-very-high/15 text-score-very-high ring-score-very-high/25",
  HIGH: "bg-score-high/15 text-score-high ring-score-high/25",
  MEDIUM: "bg-score-medium/20 text-warning-foreground ring-score-medium/30",
  LOW: "bg-score-low/12 text-score-low ring-score-low/25",
};

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function getScoreBand(score: number): ScoreBand {
  const value = clampScore(score);
  if (value >= 80) return "VERY_HIGH";
  if (value >= 60) return "HIGH";
  if (value >= 40) return "MEDIUM";
  return "LOW";
}

export function getScoreLabel(score: number): string {
  return SCORE_BAND_LABELS[getScoreBand(score)];
}
