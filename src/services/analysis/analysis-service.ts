import type { SupabaseClient } from "@supabase/supabase-js";

import { ANALYSIS_LIMITS } from "@/config/commercial-analysis";
import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import { LLMService } from "@/services/ai/llm-service";
import { calculateLandingPageOpportunity } from "@/services/opportunity/landing-page-opportunity";
import { toOpportunityLead } from "@/services/opportunity/opportunity-mapper";
import { calculateLeadScore } from "@/services/scoring/lead-score";
import { toScorableLead } from "@/services/scoring/score-mapper";
import type { CommercialAnalysisResult, StoredCommercialAnalysis } from "@/types/analysis";
import type { Lead } from "@/types/lead";

import { toAnalysisColumns, toStoredAnalysis } from "./analysis-mapper";
import {
  buildAnalysisInstructions,
  buildAnalysisPayload,
  profileForLead,
} from "./analysis-prompt";
import { commercialAnalysisSchema } from "./analysis-schema";

type Db = SupabaseClient<Database>;

export interface AnalysisStore {
  loadLead(leadId: string): Promise<Lead>;
  saveAnalysis(
    leadId: string,
    input: { result: CommercialAnalysisResult; provider: string; model: string; businessProfile: string },
  ): Promise<StoredCommercialAnalysis>;
  latestAnalysis(leadId: string): Promise<StoredCommercialAnalysis | null>;
}

/** Persistence for the commercial analysis, always scoped to the user id. */
export class AnalysisRepository implements AnalysisStore {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async loadLead(leadId: string): Promise<Lead> {
    const { LeadRepository } = await import("@/services/leads/lead-repository");
    return new LeadRepository(this.db, this.userId).findById(leadId);
  }

  async saveAnalysis(
    leadId: string,
    input: { result: CommercialAnalysisResult; provider: string; model: string; businessProfile: string },
  ): Promise<StoredCommercialAnalysis> {
    const { data, error } = await this.db
      .from("lead_ai_analyses")
      .insert({ ...toAnalysisColumns(input), lead_id: leadId, user_id: this.userId })
      .select("*")
      .single();

    if (error || !data)
      throw new AppError("Não foi possível salvar a análise comercial.", { code: "DB_ERROR" });

    return toStoredAnalysis(data);
  }

  async latestAnalysis(leadId: string): Promise<StoredCommercialAnalysis | null> {
    const { data, error } = await this.db
      .from("lead_ai_analyses")
      .select("*")
      .eq("user_id", this.userId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new AppError("Não foi possível ler a análise comercial.", { code: "DB_ERROR" });
    return data ? toStoredAnalysis(data) : null;
  }
}

/**
 * Commercial analysis orchestration.
 *
 * The LLM only interprets: the deterministic engines provide Lead Score,
 * Opportunity Score and the observed evidence, and the response is validated
 * against a strict schema before being persisted. It never runs implicitly —
 * only when the user asks for an analysis / re-analysis.
 */
export class AnalysisService {
  constructor(
    private readonly store: AnalysisStore,
    private readonly llm: LLMService,
  ) {}

  static forUser(db: Db, userId: string): AnalysisService {
    return new AnalysisService(new AnalysisRepository(db, userId), LLMService.fromEnv());
  }

  getLatest(leadId: string): Promise<StoredCommercialAnalysis | null> {
    return this.store.latestAnalysis(leadId);
  }

  async analyzeLead(
    leadId: string,
    options: { subject?: string; now?: Date } = {},
  ): Promise<StoredCommercialAnalysis> {
    const lead = await this.store.loadLead(leadId);
    if (!lead) throw new NotFoundError("Lead não encontrado");

    const now = options.now ?? new Date();
    const score = calculateLeadScore(toScorableLead(lead), now);
    const opportunity = calculateLandingPageOpportunity(toOpportunityLead(lead), now);
    const profile = profileForLead(lead);

    const { data, telemetry } = await this.llm.analyzeStructuredData({
      task: ANALYSIS_LIMITS.task,
      instructions: buildAnalysisInstructions(profile),
      schema: commercialAnalysisSchema,
      data: buildAnalysisPayload({ lead, score, opportunity }),
      maxOutputTokens: ANALYSIS_LIMITS.maxOutputTokens,
      temperature: ANALYSIS_LIMITS.temperature,
      ...(options.subject ? { subject: options.subject } : {}),
    });

    return this.store.saveAnalysis(leadId, {
      result: data,
      provider: telemetry.provider,
      model: telemetry.model,
      businessProfile: profile,
    });
  }
}
