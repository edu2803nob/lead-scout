import type { SupabaseClient } from "@supabase/supabase-js";

import { AUDIT_LIMITS } from "@/config/digital-audit";
import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import { LLMService } from "@/services/ai/llm-service";
import { profileForLead } from "@/services/analysis/analysis-prompt";
import { calculateLandingPageOpportunity } from "@/services/opportunity/landing-page-opportunity";
import { toOpportunityLead } from "@/services/opportunity/opportunity-mapper";
import { calculateLeadScore } from "@/services/scoring/lead-score";
import { toScorableLead } from "@/services/scoring/score-mapper";
import type { DigitalAuditResult, StoredDigitalAudit } from "@/types/audit";
import type { Lead } from "@/types/lead";

import { toAuditColumns, toAuditResult, toStoredAudit } from "./audit-mapper";
import { buildAuditInstructions, buildAuditPayload } from "./audit-prompt";
import { digitalAuditResponseSchema } from "./audit-schema";

type Db = SupabaseClient<Database>;

export interface AuditStore {
  loadLead(leadId: string): Promise<Lead>;
  saveAudit(leadId: string, result: DigitalAuditResult): Promise<StoredDigitalAudit>;
  latestAudit(leadId: string): Promise<StoredDigitalAudit | null>;
}

/** Persistence for the digital audit, always scoped to the authenticated user. */
export class AuditRepository implements AuditStore {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async loadLead(leadId: string): Promise<Lead> {
    const { LeadRepository } = await import("@/services/leads/lead-repository");
    return new LeadRepository(this.db, this.userId).findById(leadId);
  }

  async saveAudit(leadId: string, result: DigitalAuditResult): Promise<StoredDigitalAudit> {
    const { data, error } = await this.db
      .from("digital_audits")
      .insert({ ...toAuditColumns(result), lead_id: leadId, user_id: this.userId })
      .select("*")
      .single();

    if (error || !data)
      throw new AppError("Não foi possível salvar a auditoria digital.", { code: "DB_ERROR" });

    return toStoredAudit(data);
  }

  async latestAudit(leadId: string): Promise<StoredDigitalAudit | null> {
    const { data, error } = await this.db
      .from("digital_audits")
      .select("*")
      .eq("user_id", this.userId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error)
      throw new AppError("Não foi possível ler a auditoria digital.", { code: "DB_ERROR" });
    return data ? toStoredAudit(data) : null;
  }
}

/**
 * Digital Audit orchestration.
 *
 * Scores stay deterministic (Lead Score + Landing Page Opportunity engines) and
 * the LLM only interprets the observed data into problems, sections and
 * classified evidence. It runs only on an explicit user request.
 */
export class AuditService {
  constructor(
    private readonly store: AuditStore,
    private readonly llm: LLMService,
  ) {}

  static forUser(db: Db, userId: string): AuditService {
    return new AuditService(new AuditRepository(db, userId), LLMService.fromEnv());
  }

  getLatest(leadId: string): Promise<StoredDigitalAudit | null> {
    return this.store.latestAudit(leadId);
  }

  async auditLead(
    leadId: string,
    options: { subject?: string; now?: Date } = {},
  ): Promise<StoredDigitalAudit> {
    const lead = await this.store.loadLead(leadId);
    if (!lead) throw new NotFoundError("Lead não encontrado");

    const now = options.now ?? new Date();
    const score = calculateLeadScore(toScorableLead(lead), now);
    const opportunity = calculateLandingPageOpportunity(toOpportunityLead(lead), now);
    const profile = profileForLead(lead);

    const { data } = await this.llm.analyzeStructuredData({
      task: AUDIT_LIMITS.task,
      instructions: buildAuditInstructions(profile),
      schema: digitalAuditResponseSchema,
      data: buildAuditPayload({ lead, score, opportunity }),
      maxOutputTokens: AUDIT_LIMITS.maxOutputTokens,
      temperature: AUDIT_LIMITS.temperature,
      ...(options.subject ? { subject: options.subject } : {}),
    });

    const result = toAuditResult(
      data,
      {
        digitalPresenceScore: score.digitalPresenceScore,
        conversionOpportunity: score.conversionOpportunityScore,
        landingPageOpportunity: opportunity.opportunityScore,
      },
      profile,
    );

    return this.store.saveAudit(leadId, result);
  }
}
