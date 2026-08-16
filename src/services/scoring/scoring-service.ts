import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import type { Lead } from "@/types/lead";
import type { LeadScoreResult } from "@/types/scoring";

import { calculateLeadScore } from "./lead-score";
import { toScorableLead, toScoreColumns } from "./score-mapper";

type Db = SupabaseClient<Database>;

export interface ScoringStore {
  loadLead(leadId: string): Promise<Lead>;
  saveScore(leadId: string, result: LeadScoreResult): Promise<void>;
}

/**
 * Persistence for the scoring engine. Every query is scoped to the
 * authenticated user id (on top of RLS) and the raw lead is never modified.
 */
export class ScoringRepository implements ScoringStore {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async loadLead(leadId: string): Promise<Lead> {
    const { LeadRepository } = await import("@/services/leads/lead-repository");
    return new LeadRepository(this.db, this.userId).findById(leadId);
  }

  async saveScore(leadId: string, result: LeadScoreResult): Promise<void> {
    const columns = toScoreColumns(result);

    const { data: existing, error: readError } = await this.db
      .from("lead_scores")
      .select("id")
      .eq("user_id", this.userId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readError) throw new AppError("Não foi possível ler o score do lead.", { code: "DB_ERROR" });

    const { error } = existing
      ? await this.db
          .from("lead_scores")
          .update(columns)
          .eq("user_id", this.userId)
          .eq("id", existing.id)
      : await this.db
          .from("lead_scores")
          .insert({ ...columns, lead_id: leadId, user_id: this.userId });

    if (error) throw new AppError("Não foi possível salvar o score do lead.", { code: "DB_ERROR" });
  }
}

/**
 * Orchestrates scoring: loads the lead, runs the deterministic engine and
 * stores the dimensions. No LLM is involved in the numbers.
 */
export class ScoringService {
  constructor(private readonly store: ScoringStore) {}

  static forUser(db: Db, userId: string): ScoringService {
    return new ScoringService(new ScoringRepository(db, userId));
  }

  async scoreLead(leadId: string, now: Date = new Date()): Promise<LeadScoreResult> {
    const lead = await this.store.loadLead(leadId);
    if (!lead) throw new NotFoundError("Lead não encontrado");

    const result = calculateLeadScore(toScorableLead(lead), now);
    await this.store.saveScore(leadId, result);
    return result;
  }
}
