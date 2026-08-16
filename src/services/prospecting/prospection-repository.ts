import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import type { StartProspectionInput } from "@/lib/validation/prospecting";
import type {
  PlaceResult,
  Prospection,
  ProspectionResult,
  ProspectionStatus,
} from "@/types/prospecting";

import {
  toProspection,
  toProspectionResult,
  toResultColumns,
  type ProspectionResultRow,
  type ProspectionRow,
} from "./prospection-mapper";

type Db = SupabaseClient<Database>;

function fail(message: string, error: { message?: string } | null): never {
  throw new AppError(`${message}${error?.message ? `: ${error.message}` : ""}`, {
    code: "DB_ERROR",
    status: 500,
  });
}

/**
 * Persistence for prospections and their results. Every query is scoped to the
 * authenticated user id (in addition to row-level security).
 */
export class ProspectionRepository {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async create(input: StartProspectionInput, name: string): Promise<Prospection> {
    const { data, error } = await this.db
      .from("prospections")
      .insert({
        user_id: this.userId,
        name,
        provider: "GOOGLE_PLACES",
        category: input.category,
        subcategory: input.subcategory,
        city: input.city,
        state: input.state,
        neighborhood: input.neighborhood,
        radius: input.radiusKm,
        requested_limit: input.limit,
        status: "RUNNING",
      })
      .select("*")
      .single();

    if (error) fail("Não foi possível criar a prospecção", error);
    return toProspection(data as ProspectionRow);
  }

  async findById(id: string): Promise<Prospection> {
    const { data, error } = await this.db
      .from("prospections")
      .select("*")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();

    if (error) fail("Não foi possível carregar a prospecção", error);
    if (!data) throw new NotFoundError("Prospecção não encontrada");
    return toProspection(data as ProspectionRow);
  }

  async status(id: string): Promise<ProspectionStatus | null> {
    const { data, error } = await this.db
      .from("prospections")
      .select("status")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();

    if (error) fail("Não foi possível verificar a prospecção", error);
    return (data as { status: ProspectionStatus } | null)?.status ?? null;
  }

  async list(limit: number): Promise<Prospection[]> {
    const { data, error } = await this.db
      .from("prospections")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) fail("Não foi possível listar as prospecções", error);
    return ((data ?? []) as ProspectionRow[]).map(toProspection);
  }

  async patch(
    id: string,
    patch: Partial<{
      status: ProspectionStatus;
      found_count: number;
      imported_count: number;
      error_message: string | null;
      completed_at: string | null;
    }>,
  ): Promise<Prospection> {
    const { data, error } = await this.db
      .from("prospections")
      .update(patch)
      .eq("user_id", this.userId)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) fail("Não foi possível atualizar a prospecção", error);
    if (!data) throw new NotFoundError("Prospecção não encontrada");
    return toProspection(data as ProspectionRow);
  }

  /** Upserts a page of places; duplicated place ids inside a run are ignored. */
  async saveResults(prospectionId: string, places: PlaceResult[]): Promise<number> {
    if (places.length === 0) return 0;

    const rows = places.map((place) => ({
      ...toResultColumns(place),
      user_id: this.userId,
      prospection_id: prospectionId,
    }));

    const { data, error } = await this.db
      .from("prospection_results")
      .upsert(rows, { onConflict: "prospection_id,google_place_id", ignoreDuplicates: true })
      .select("id");

    if (error) fail("Não foi possível salvar os resultados", error);
    return (data ?? []).length;
  }

  async countResults(prospectionId: string): Promise<number> {
    const { count, error } = await this.db
      .from("prospection_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId)
      .eq("prospection_id", prospectionId);

    if (error) fail("Não foi possível contar os resultados", error);
    return count ?? 0;
  }

  async listResults(prospectionId: string, ids: string[] = []): Promise<ProspectionResult[]> {
    let query = this.db
      .from("prospection_results")
      .select("*")
      .eq("user_id", this.userId)
      .eq("prospection_id", prospectionId)
      .order("created_at", { ascending: true });

    if (ids.length > 0) query = query.in("id", ids);

    const { data, error } = await query;
    if (error) fail("Não foi possível carregar os resultados", error);
    return ((data ?? []) as ProspectionResultRow[]).map(toProspectionResult);
  }

  async markImported(resultId: string, leadId: string): Promise<void> {
    const { error } = await this.db
      .from("prospection_results")
      .update({ imported: true, lead_id: leadId })
      .eq("user_id", this.userId)
      .eq("id", resultId);

    if (error) fail("Não foi possível marcar o resultado como importado", error);
  }
}
