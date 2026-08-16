import { cn } from "@/lib/utils";
import {
  clampScore,
  getScoreBand,
  SCORE_BAND_CLASSES,
  SCORE_BAND_LABELS,
} from "@/lib/design/score";

export interface ScoreBadgeProps {
  score: number | null | undefined;
  /** Show the band label ("Muito alto") next to the number. */
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ScoreBadge({ score, showLabel = true, size = "md", className }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border",
          className,
        )}
      >
        Sem score
      </span>
    );
  }

  const value = clampScore(score);
  const band = getScoreBand(value);

  return (
    <span
      title={`Score ${value} — ${SCORE_BAND_LABELS[band]}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset tabular-nums",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        SCORE_BAND_CLASSES[band],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {value}
      {showLabel ? <span className="font-medium opacity-80">{SCORE_BAND_LABELS[band]}</span> : null}
    </span>
  );
}
