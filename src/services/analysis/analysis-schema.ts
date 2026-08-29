import { z } from "zod";

import { ANALYSIS_LIMITS } from "@/config/commercial-analysis";
import { ANALYSIS_STATEMENT_KINDS, type AnalysisStatementKind } from "@/types/analysis";

/**
 * Response contract for the commercial analysis.
 *
 * The shape is strict, but tolerant of harmless model formatting habits
 * (numbers written as text, a single string instead of a list, extra items,
 * lowercase evidence kinds). Anything that cannot be normalised is rejected —
 * no partial saves.
 */

const statement = z.string().trim().min(3).max(ANALYSIS_LIMITS.maxStatementChars);

/** Textual scores some models return instead of a number. */
const POTENTIAL_LABELS: Record<string, number> = {
  "muito baixo": 10,
  baixo: 25,
  "médio": 50,
  medio: 50,
  moderado: 50,
  alto: 75,
  "muito alto": 90,
  low: 25,
  medium: 50,
  high: 75,
  "very high": 90,
};

function toNumber(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const text = value.trim().toLowerCase();
  const labelled = POTENTIAL_LABELS[text];
  if (labelled !== undefined) return labelled;
  const percent = text.endsWith("%");
  const parsed = Number(text.replace("%", "").replace(",", ".").trim());
  if (!Number.isFinite(parsed)) return value;
  return percent ? parsed : parsed;
}

/** 0-100 score, accepting 0-1 fractions and textual labels. */
const scoreField = z.preprocess((value) => {
  const numeric = toNumber(value);
  if (typeof numeric !== "number") return numeric;
  const scaled = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Math.min(100, Math.max(0, Math.round(scaled)));
}, z.number().min(0).max(100));

/** 0-1 confidence, accepting percentages and textual labels. */
const confidenceField = z.preprocess((value) => {
  const numeric = toNumber(value);
  if (typeof numeric !== "number") return numeric;
  const scaled = numeric > 1 ? numeric / 100 : numeric;
  return Math.min(1, Math.max(0, Math.round(scaled * 100) / 100));
}, z.number().min(0).max(1));

/** Accepts a list (or a single statement) and keeps the first N valid items. */
const statementList = z.preprocess(
  (value) => {
    const items = Array.isArray(value) ? value : value === undefined ? [] : [value];
    return items
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : item && typeof item === "object" && "statement" in item
            ? String((item as { statement: unknown }).statement).trim()
            : item,
      )
      .filter((item): item is string => typeof item === "string" && item.length >= 3)
      .slice(0, ANALYSIS_LIMITS.maxListItems)
      .map((item) => item.slice(0, ANALYSIS_LIMITS.maxStatementChars));
  },
  z.array(statement).min(1).max(ANALYSIS_LIMITS.maxListItems),
);

const kindField = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toUpperCase();
  const aliases: Record<string, AnalysisStatementKind> = {
    FACT: "FACT",
    FATO: "FACT",
    INFERENCE: "INFERENCE",
    "INFERÊNCIA": "INFERENCE",
    INFERENCIA: "INFERENCE",
    UNKNOWN: "UNKNOWN",
    DESCONHECIDO: "UNKNOWN",
    LACUNA: "UNKNOWN",
  };
  return aliases[normalized] ?? normalized;
}, z.enum(ANALYSIS_STATEMENT_KINDS));

export const analysisEvidenceSchema = z.object({
  kind: kindField,
  statement,
  source: z.string().trim().max(60).optional(),
});

const evidenceList = z.preprocess(
  (value) => (Array.isArray(value) ? value.slice(0, 14) : value),
  z.array(analysisEvidenceSchema).min(1).max(14),
);

export const commercialAnalysisSchema = z.object({
  purchasePotential: scoreField,
  confidence: confidenceField,
  summary: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().slice(0, 800) : value),
    z.string().min(10).max(800),
  ),
  painPoints: statementList,
  opportunities: statementList,
  recommendedOffer: statement,
  recommendedApproach: statement,
  reasoning: statementList,
  evidence: evidenceList,
});

export type CommercialAnalysisResponse = z.infer<typeof commercialAnalysisSchema>;
