import { z } from "zod";

import { ANALYSIS_LIMITS } from "@/config/commercial-analysis";
import { ANALYSIS_STATEMENT_KINDS } from "@/types/analysis";

/**
 * Response contract for the commercial analysis.
 * Anything outside this shape is rejected by the LLM service (no partial saves).
 */

const statement = z
  .string()
  .trim()
  .min(3)
  .max(ANALYSIS_LIMITS.maxStatementChars);

const statementList = z.array(statement).min(1).max(ANALYSIS_LIMITS.maxListItems);

export const analysisEvidenceSchema = z.object({
  kind: z.enum(ANALYSIS_STATEMENT_KINDS),
  statement,
  source: z.string().trim().max(60).optional(),
});

export const commercialAnalysisSchema = z.object({
  purchasePotential: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(10).max(800),
  painPoints: statementList,
  opportunities: statementList,
  recommendedOffer: statement,
  recommendedApproach: statement,
  reasoning: statementList,
  evidence: z.array(analysisEvidenceSchema).min(1).max(14),
});

export type CommercialAnalysisResponse = z.infer<typeof commercialAnalysisSchema>;
