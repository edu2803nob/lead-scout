/**
 * Domain types for the commercial analysis module (LLM-assisted).
 *
 * The LLM never computes scores and never invents data: every statement must be
 * classified as FACT (observed), INFERENCE (hypothesis) or UNKNOWN (missing).
 */

export const ANALYSIS_STATEMENT_KINDS = ["FACT", "INFERENCE", "UNKNOWN"] as const;

export type AnalysisStatementKind = (typeof ANALYSIS_STATEMENT_KINDS)[number];

export const ANALYSIS_STATEMENT_LABELS: Record<AnalysisStatementKind, string> = {
  FACT: "Fato",
  INFERENCE: "Inferência",
  UNKNOWN: "Desconhecido",
};

/** One classified statement backing the analysis. */
export interface AnalysisEvidenceItem {
  kind: AnalysisStatementKind;
  statement: string;
  /** Which observed field supports it, when applicable. */
  source?: string | undefined;
}

export interface CommercialAnalysisResult {
  /** 0-100: how likely this business is to buy the offer. */
  purchasePotential: number;
  /** 0-1: how confident the model is, given the available data. */
  confidence: number;
  summary: string;
  painPoints: string[];
  opportunities: string[];
  recommendedOffer: string;
  recommendedApproach: string;
  reasoning: string[];
  evidence: AnalysisEvidenceItem[];
}

/** Stored analysis (result + provenance), as returned to the UI. */
export interface StoredCommercialAnalysis extends CommercialAnalysisResult {
  id: string;
  leadId: string;
  provider: string;
  model: string;
  businessProfile: string | null;
  createdAt: string;
  updatedAt: string;
}
