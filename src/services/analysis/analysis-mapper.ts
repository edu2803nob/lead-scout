import type { Database } from "@/integrations/supabase/types";
import type {
  AnalysisEvidenceItem,
  CommercialAnalysisResult,
  StoredCommercialAnalysis,
} from "@/types/analysis";

type AnalysisRow = Database["public"]["Tables"]["lead_ai_analyses"]["Row"] & {
  reasoning_items?: unknown;
  evidence?: unknown;
  business_profile?: string | null;
};
type AnalysisInsert = Database["public"]["Tables"]["lead_ai_analyses"]["Insert"];

export interface AnalysisColumnsInput {
  result: CommercialAnalysisResult;
  provider: string;
  model: string;
  businessProfile: string;
}

/** Result -> database columns. Prompts are never persisted. */
export function toAnalysisColumns(
  input: AnalysisColumnsInput,
): Omit<AnalysisInsert, "user_id" | "lead_id"> {
  const { result } = input;
  return {
    provider: input.provider,
    model: input.model,
    summary: result.summary,
    purchase_potential: Math.round(result.purchasePotential),
    confidence: result.confidence,
    pain_points: result.painPoints as unknown as NonNullable<AnalysisInsert["pain_points"]>,
    opportunities: result.opportunities as unknown as NonNullable<AnalysisInsert["opportunities"]>,
    reasoning: result.reasoning.join("\n"),
    recommended_offer: result.recommendedOffer,
    recommended_approach: result.recommendedApproach,
    ...({
      reasoning_items: result.reasoning,
      evidence: result.evidence,
      business_profile: input.businessProfile,
    } as Record<string, unknown>),
  } as Omit<AnalysisInsert, "user_id" | "lead_id">;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function toEvidenceList(value: unknown): AnalysisEvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const kind = record["kind"];
    const statement = record["statement"];
    if (kind !== "FACT" && kind !== "INFERENCE" && kind !== "UNKNOWN") return [];
    if (typeof statement !== "string" || !statement.trim()) return [];
    const source = typeof record["source"] === "string" ? record["source"] : undefined;
    return [{ kind, statement, source }];
  });
}

/** Database row -> domain object consumed by the UI. */
export function toStoredAnalysis(row: AnalysisRow): StoredCommercialAnalysis {
  const reasoningItems = toStringList(row.reasoning_items);
  const reasoning =
    reasoningItems.length > 0
      ? reasoningItems
      : toStringList((row.reasoning ?? "").split("\n").map((line) => line.trim()));

  return {
    id: row.id,
    leadId: row.lead_id,
    provider: row.provider,
    model: row.model,
    businessProfile: row.business_profile ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    purchasePotential: row.purchase_potential ?? 0,
    confidence: row.confidence === null ? 0 : Number(row.confidence),
    summary: row.summary ?? "",
    painPoints: toStringList(row.pain_points),
    opportunities: toStringList(row.opportunities),
    recommendedOffer: row.recommended_offer ?? "",
    recommendedApproach: row.recommended_approach ?? "",
    reasoning,
    evidence: toEvidenceList(row.evidence),
  };
}
