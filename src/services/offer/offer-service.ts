import type { SupabaseClient } from "@supabase/supabase-js";

import { OFFER_LIMITS } from "@/config/offer";
import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import { LLMService } from "@/services/ai/llm-service";
import { profileForLead } from "@/services/analysis/analysis-prompt";
import { calculateLandingPageOpportunity } from "@/services/opportunity/landing-page-opportunity";
import { toOpportunityLead } from "@/services/opportunity/opportunity-mapper";
import type { StoredCommercialAnalysis } from "@/types/analysis";
import type { StoredDigitalAudit } from "@/types/audit";
import type { Lead } from "@/types/lead";
import type { OfferLinkedProblem, OfferRecommendationResult, StoredOfferRecommendation } from "@/types/offer";

import { toOfferColumns, toOfferResult, toStoredOffer } from "./offer-mapper";
import { buildOfferInstructions, buildOfferPayload } from "./offer-prompt";
import { offerRecommendationResponseSchema } from "./offer-schema";

type Db = SupabaseClient<Database>;

export interface OfferStore {
  loadLead(leadId: string): Promise<Lead>;
  latestAudit(leadId: string): Promise<StoredDigitalAudit | null>;
  latestAnalysis(leadId: string): Promise<StoredCommercialAnalysis | null>;
  saveOffer(
    leadId: string,
    input: {
      result: OfferRecommendationResult;
      provider: string;
      model: string;
      businessProfile: string;
    },
  ): Promise<StoredOfferRecommendation>;
  latestOffer(leadId: string): Promise<StoredOfferRecommendation | null>;
}

/** Persistence for the offer recommendation, always scoped to the user id. */
export class OfferRepository implements OfferStore {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async loadLead(leadId: string): Promise<Lead> {
    const { LeadRepository } = await import("@/services/leads/lead-repository");
    return new LeadRepository(this.db, this.userId).findById(leadId);
  }

  /** Read-only: previous audits and analyses are never modified by this module. */
  async latestAudit(leadId: string): Promise<StoredDigitalAudit | null> {
    const { AuditRepository } = await import("@/services/audit/audit-service");
    return new AuditRepository(this.db, this.userId).latestAudit(leadId);
  }

  async latestAnalysis(leadId: string): Promise<StoredCommercialAnalysis | null> {
    const { AnalysisRepository } = await import("@/services/analysis/analysis-service");
    return new AnalysisRepository(this.db, this.userId).latestAnalysis(leadId);
  }

  async saveOffer(
    leadId: string,
    input: {
      result: OfferRecommendationResult;
      provider: string;
      model: string;
      businessProfile: string;
    },
  ): Promise<StoredOfferRecommendation> {
    const { data, error } = await this.db
      .from("lead_offers")
      .insert({ ...toOfferColumns(input), lead_id: leadId, user_id: this.userId })
      .select("*")
      .single();

    if (error || !data)
      throw new AppError("Não foi possível salvar a recomendação de oferta.", { code: "DB_ERROR" });

    return toStoredOffer(data);
  }

  async latestOffer(leadId: string): Promise<StoredOfferRecommendation | null> {
    const { data, error } = await this.db
      .from("lead_offers")
      .select("*")
      .eq("user_id", this.userId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error)
      throw new AppError("Não foi possível ler a recomendação de oferta.", { code: "DB_ERROR" });
    return data ? toStoredOffer(data) : null;
  }
}

/** Problems already identified elsewhere; this module only reads them. */
export function collectObservedProblems(
  audit: StoredDigitalAudit | null | undefined,
  analysis: StoredCommercialAnalysis | null | undefined,
): OfferLinkedProblem[] {
  const fromAudit: OfferLinkedProblem[] = (audit?.conversionProblems ?? []).map((item) => ({
    area: item.area,
    severity: item.severity,
    problem: item.problem,
  }));

  if (fromAudit.length > 0) return fromAudit.slice(0, OFFER_LIMITS.maxLinkedProblems);

  return (analysis?.painPoints ?? [])
    .slice(0, OFFER_LIMITS.maxLinkedProblems)
    .map((problem) => ({ area: "DIGITAL_PRESENCE" as const, severity: "MEDIUM" as const, problem }));
}

/**
 * Offer recommendation orchestration.
 *
 * It reuses the stored digital audit / commercial analysis (never modifying
 * them) and refuses to recommend anything when no commercial problem was
 * identified — the module never "sells a website" by default. It runs only on an
 * explicit user request.
 */
export class OfferService {
  constructor(
    private readonly store: OfferStore,
    private readonly llm: LLMService,
  ) {}

  static forUser(db: Db, userId: string): OfferService {
    return new OfferService(new OfferRepository(db, userId), LLMService.fromEnv());
  }

  getLatest(leadId: string): Promise<StoredOfferRecommendation | null> {
    return this.store.latestOffer(leadId);
  }

  async recommendOffer(
    leadId: string,
    options: { subject?: string; now?: Date } = {},
  ): Promise<StoredOfferRecommendation> {
    const lead = await this.store.loadLead(leadId);
    if (!lead) throw new NotFoundError("Lead não encontrado");

    const [audit, analysis] = await Promise.all([
      this.store.latestAudit(leadId),
      this.store.latestAnalysis(leadId),
    ]);

    const observedProblems = collectObservedProblems(audit, analysis);
    if (observedProblems.length === 0) {
      throw new AppError(
        "Execute a auditoria digital ou a análise comercial primeiro: a oferta precisa estar vinculada a um problema comercial identificado.",
        { code: "VALIDATION_ERROR" },
      );
    }

    const now = options.now ?? new Date();
    const opportunity = calculateLandingPageOpportunity(toOpportunityLead(lead), now);
    const profile = profileForLead(lead);

    const { data, telemetry } = await this.llm.analyzeStructuredData({
      task: OFFER_LIMITS.task,
      instructions: buildOfferInstructions(profile),
      schema: offerRecommendationResponseSchema,
      data: buildOfferPayload({ lead, opportunity, audit, analysis }),
      maxOutputTokens: OFFER_LIMITS.maxOutputTokens,
      temperature: OFFER_LIMITS.temperature,
      ...(options.subject ? { subject: options.subject } : {}),
    });

    const result = toOfferResult(data, { profile, observedProblems });

    return this.store.saveOffer(leadId, {
      result,
      provider: telemetry.provider,
      model: telemetry.model,
      businessProfile: profile,
    });
  }
}
