import type { SupabaseClient } from "@supabase/supabase-js";

import { OUTREACH_LIMITS, OUTREACH_STYLES, type OutreachStyle } from "@/config/outreach";
import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import { LLMService } from "@/services/ai/llm-service";
import { profileForLead } from "@/services/analysis/analysis-prompt";
import type { StoredCommercialAnalysis } from "@/types/analysis";
import type { StoredDigitalAudit } from "@/types/audit";
import type { Lead } from "@/types/lead";
import type { StoredOfferRecommendation } from "@/types/offer";
import type { OutreachMessageResult, StoredOutreachMessage } from "@/types/outreach";

import { toOutreachColumns, toOutreachResults, toStoredOutreach } from "./outreach-mapper";
import { buildOutreachInstructions, buildOutreachPayload } from "./outreach-prompt";
import { outreachResponseSchema } from "./outreach-schema";

type Db = SupabaseClient<Database>;

export interface OutreachStore {
  loadLead(leadId: string): Promise<Lead>;
  latestAudit(leadId: string): Promise<StoredDigitalAudit | null>;
  latestAnalysis(leadId: string): Promise<StoredCommercialAnalysis | null>;
  latestOffer(leadId: string): Promise<StoredOfferRecommendation | null>;
  latestMessages(leadId: string): Promise<StoredOutreachMessage[]>;
  saveMessages(
    leadId: string,
    input: {
      results: OutreachMessageResult[];
      batchId: string;
      provider: string;
      model: string;
      businessProfile: string;
    },
  ): Promise<StoredOutreachMessage[]>;
  updateMessage(id: string, message: string): Promise<StoredOutreachMessage>;
  markUsed(id: string, usedAt: Date): Promise<StoredOutreachMessage>;
  registerInteraction(input: {
    leadId: string;
    subject: string;
    content: string;
    occurredAt: Date;
  }): Promise<void>;
}

/** Persistence for outreach suggestions, always scoped to the authenticated user. */
export class OutreachRepository implements OutreachStore {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async loadLead(leadId: string): Promise<Lead> {
    const { LeadRepository } = await import("@/services/leads/lead-repository");
    return new LeadRepository(this.db, this.userId).findById(leadId);
  }

  /** Read-only: audits, analyses and offers are never modified by this module. */
  async latestAudit(leadId: string): Promise<StoredDigitalAudit | null> {
    const { AuditRepository } = await import("@/services/audit/audit-service");
    return new AuditRepository(this.db, this.userId).latestAudit(leadId);
  }

  async latestAnalysis(leadId: string): Promise<StoredCommercialAnalysis | null> {
    const { AnalysisRepository } = await import("@/services/analysis/analysis-service");
    return new AnalysisRepository(this.db, this.userId).latestAnalysis(leadId);
  }

  async latestOffer(leadId: string): Promise<StoredOfferRecommendation | null> {
    const { OfferRepository } = await import("@/services/offer/offer-service");
    return new OfferRepository(this.db, this.userId).latestOffer(leadId);
  }

  async latestMessages(leadId: string): Promise<StoredOutreachMessage[]> {
    const { data, error } = await this.db
      .from("lead_outreach_messages")
      .select("*")
      .eq("user_id", this.userId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(OUTREACH_STYLES.length * 2);

    if (error) throw new AppError("Não foi possível ler as abordagens.", { code: "DB_ERROR" });

    const rows = (data ?? []).map(toStoredOutreach);
    const latestBatch = rows[0]?.batchId;
    if (!latestBatch) return [];

    return rows
      .filter((row) => row.batchId === latestBatch)
      .sort((a, b) => OUTREACH_STYLES.indexOf(a.style) - OUTREACH_STYLES.indexOf(b.style));
  }

  async saveMessages(
    leadId: string,
    input: {
      results: OutreachMessageResult[];
      batchId: string;
      provider: string;
      model: string;
      businessProfile: string;
    },
  ): Promise<StoredOutreachMessage[]> {
    const rows = input.results.map((result) => ({
      ...toOutreachColumns({ ...input, result }),
      lead_id: leadId,
      user_id: this.userId,
    }));

    // Upsert per (batch, style): regenerating one style replaces that suggestion
    // inside the current batch instead of dropping the other styles.
    const { data, error } = await this.db
      .from("lead_outreach_messages")
      .upsert(rows, { onConflict: "batch_id,style" })
      .select("*");


    if (error || !data)
      throw new AppError("Não foi possível salvar as abordagens geradas.", { code: "DB_ERROR" });

    return data.map(toStoredOutreach);
  }

  async updateMessage(id: string, message: string): Promise<StoredOutreachMessage> {
    const { data, error } = await this.db
      .from("lead_outreach_messages")
      .update({ message, is_edited: true })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select("*")
      .maybeSingle();

    if (error) throw new AppError("Não foi possível salvar a edição.", { code: "DB_ERROR" });
    if (!data) throw new NotFoundError("Abordagem não encontrada");
    return toStoredOutreach(data);
  }

  async markUsed(id: string, usedAt: Date): Promise<StoredOutreachMessage> {
    const { data, error } = await this.db
      .from("lead_outreach_messages")
      .update({ used_at: usedAt.toISOString() })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select("*")
      .maybeSingle();

    if (error) throw new AppError("Não foi possível registrar o uso.", { code: "DB_ERROR" });
    if (!data) throw new NotFoundError("Abordagem não encontrada");
    return toStoredOutreach(data);
  }

  /** History only: a note is added, no CRM field (status, owner…) is touched. */
  async registerInteraction(input: {
    leadId: string;
    subject: string;
    content: string;
    occurredAt: Date;
  }): Promise<void> {
    const { error } = await this.db.from("lead_interactions").insert({
      user_id: this.userId,
      lead_id: input.leadId,
      type: "NOTE",
      subject: input.subject,
      content: input.content,
      occurred_at: input.occurredAt.toISOString(),
    });

    if (error)
      throw new AppError("Não foi possível registrar a abordagem no histórico.", {
        code: "DB_ERROR",
      });
  }
}

/**
 * Outreach generation orchestration.
 *
 * Generates suggestions only on explicit user request, never sends anything and
 * never invents data: the payload carries only observed lead fields plus the
 * stored audit / analysis / offer (all read-only here).
 */
export class OutreachService {
  constructor(
    private readonly store: OutreachStore,
    private readonly llm: LLMService,
  ) {}

  static forUser(db: Db, userId: string): OutreachService {
    return new OutreachService(new OutreachRepository(db, userId), LLMService.fromEnv());
  }

  getLatest(leadId: string): Promise<StoredOutreachMessage[]> {
    return this.store.latestMessages(leadId);
  }

  async generate(
    leadId: string,
    options: { subject?: string; styles?: readonly OutreachStyle[] } = {},
  ): Promise<StoredOutreachMessage[]> {
    const styles = options.styles?.length ? options.styles : OUTREACH_STYLES;

    const lead = await this.store.loadLead(leadId);
    if (!lead) throw new NotFoundError("Lead não encontrado");

    const [audit, analysis, offer] = await Promise.all([
      this.store.latestAudit(leadId),
      this.store.latestAnalysis(leadId),
      this.store.latestOffer(leadId),
    ]);

    const profile = profileForLead(lead);

    const { data, telemetry } = await this.llm.analyzeStructuredData({
      task: OUTREACH_LIMITS.task,
      instructions: buildOutreachInstructions(profile, styles),
      schema: outreachResponseSchema,
      data: buildOutreachPayload({ lead, audit, analysis, offer }),
      maxOutputTokens: OUTREACH_LIMITS.maxOutputTokens,
      temperature: OUTREACH_LIMITS.temperature,
      ...(options.subject ? { subject: options.subject } : {}),
    });

    const results = toOutreachResults(data.messages, styles);
    if (results.length === 0) {
      throw new AppError(
        "As mensagens geradas não atenderam às regras de abordagem. Gere novamente.",
        { code: "AI_INVALID_RESPONSE" },
      );
    }

    // Regenerating a subset keeps the current batch, so the other styles survive.
    const current = styles.length < OUTREACH_STYLES.length ? await this.getLatest(leadId) : [];
    const batchId = current[0]?.batchId ?? crypto.randomUUID();

    const saved = await this.store.saveMessages(leadId, {
      results,
      batchId,
      provider: telemetry.provider,
      model: telemetry.model,
      businessProfile: profile,
    });

    return this.store.latestMessages(leadId).catch(() => saved);
  }


  /** Saves a human edit of the suggested text. Nothing is sent. */
  async saveEdit(id: string, message: string): Promise<StoredOutreachMessage> {
    return this.store.updateMessage(id, message.trim());
  }

  /**
   * Registers that the user used this approach: marks the message and adds a note
   * to the lead history. Sending happens outside the app, by the user.
   */
  async markUsed(
    id: string,
    options: { now?: Date } = {},
  ): Promise<StoredOutreachMessage> {
    const now = options.now ?? new Date();
    const message = await this.store.markUsed(id, now);

    await this.store.registerInteraction({
      leadId: message.leadId,
      subject: `Abordagem ${message.style} utilizada`,
      content: message.message,
      occurredAt: now,
    });

    return message;
  }
}
