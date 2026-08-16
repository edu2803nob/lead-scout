import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import type { EnrichmentPatch, SocialSignals } from "@/types/enrichment";

import {
  toEnrichmentLead,
  toLeadEnrichmentColumns,
  toSocialProfileColumns,
} from "./enrichment-mapper";
import type { EnrichmentLead } from "./provider";

type Db = SupabaseClient<Database>;

function fail(message: string, error: { message?: string } | null): never {
  throw new AppError(`${message}${error?.message ? `: ${error.message}` : ""}`, {
    code: "DB_ERROR",
    status: 500,
  });
}

/**
 * Data access for enrichment. Every query is scoped to the authenticated user
 * id (in addition to RLS) — the user id never comes from client input.
 */
export class EnrichmentRepository {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async loadLead(leadId: string): Promise<EnrichmentLead> {
    const { data, error } = await this.db
      .from("leads")
      .select("*")
      .eq("user_id", this.userId)
      .eq("id", leadId)
      .maybeSingle();

    if (error) fail("Não foi possível carregar o lead", error);
    if (!data) throw new NotFoundError("Lead não encontrado");
    return toEnrichmentLead(data);
  }

  async applyPatch(leadId: string, patch: EnrichmentPatch): Promise<void> {
    const columns = toLeadEnrichmentColumns(patch);
    if (Object.keys(columns).length === 0) return;

    const { error } = await this.db
      .from("leads")
      .update(columns)
      .eq("user_id", this.userId)
      .eq("id", leadId);

    if (error) fail("Não foi possível salvar o enriquecimento", error);
  }

  /** One row per (lead, network): updates when present, inserts otherwise. */
  async saveSocialProfiles(leadId: string, profiles: SocialSignals[]): Promise<void> {
    for (const profile of profiles) {
      const columns = toSocialProfileColumns(profile);

      const { data: existing, error: readError } = await this.db
        .from("lead_social_profiles")
        .select("id")
        .eq("user_id", this.userId)
        .eq("lead_id", leadId)
        .eq("network", profile.network)
        .maybeSingle();

      if (readError) fail("Não foi possível ler os perfis sociais", readError);

      if (existing) {
        const { error } = await this.db
          .from("lead_social_profiles")
          .update(columns)
          .eq("user_id", this.userId)
          .eq("id", existing.id);
        if (error) fail("Não foi possível atualizar o perfil social", error);
        continue;
      }

      const { error } = await this.db
        .from("lead_social_profiles")
        .insert({ ...columns, lead_id: leadId, user_id: this.userId });
      if (error) fail("Não foi possível registrar o perfil social", error);
    }
  }
}
