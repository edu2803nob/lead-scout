import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import type { Lead } from "@/types/lead";
import type { LandingPageOpportunityResult } from "@/types/opportunity";

import { calculateLandingPageOpportunity } from "./landing-page-opportunity";
import { toOpportunityLead, toOpportunityRows } from "./opportunity-mapper";

type Db = SupabaseClient<Database>;

export interface OpportunityStore {
  loadLead(leadId: string): Promise<Lead>;
  replaceOpportunities(leadId: string, result: LandingPageOpportunityResult): Promise<void>;
}

/**
 * Persistence for the opportunity engine. Every query is scoped to the
 * authenticated user id (on top of RLS) and the raw lead is never modified.
 */
export class OpportunityRepository implements OpportunityStore {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async loadLead(leadId: string): Promise<Lead> {
    const { LeadRepository } = await import("@/services/leads/lead-repository");
    return new LeadRepository(this.db, this.userId).findById(leadId);
  }

  async replaceOpportunities(
    leadId: string,
    result: LandingPageOpportunityResult,
  ): Promise<void> {
    const { error: deleteError } = await this.db
      .from("opportunities")
      .delete()
      .eq("user_id", this.userId)
      .eq("lead_id", leadId);

    if (deleteError)
      throw new AppError("Não foi possível atualizar as oportunidades do lead.", {
        code: "DB_ERROR",
      });

    const rows = toOpportunityRows(result);
    if (rows.length === 0) return;

    const { error } = await this.db
      .from("opportunities")
      .insert(rows.map((row) => ({ ...row, lead_id: leadId, user_id: this.userId })));

    if (error)
      throw new AppError("Não foi possível salvar as oportunidades do lead.", {
        code: "DB_ERROR",
      });
  }
}

/**
 * Orchestrates the Landing Page Opportunity analysis: loads the lead, runs the
 * deterministic engine and persists the emitted types with their evidence.
 */
export class OpportunityService {
  constructor(private readonly store: OpportunityStore) {}

  static forUser(db: Db, userId: string): OpportunityService {
    return new OpportunityService(new OpportunityRepository(db, userId));
  }

  async analyzeLead(
    leadId: string,
    now: Date = new Date(),
  ): Promise<LandingPageOpportunityResult> {
    const lead = await this.store.loadLead(leadId);
    if (!lead) throw new NotFoundError("Lead não encontrado");

    const result = calculateLandingPageOpportunity(toOpportunityLead(lead), now);
    await this.store.replaceOpportunities(leadId, result);
    return result;
  }
}
