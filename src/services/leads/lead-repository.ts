import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import { sanitizeSearchTerm } from "@/lib/security/sanitize";
import type { LeadInput, ListLeadsParams } from "@/lib/validation/lead";
import type { Lead, LeadListResult, LeadStats, LeadStatus } from "@/types/lead";
import { LEAD_STATUSES, OPEN_LEAD_STATUSES } from "@/types/lead";

import { toLead, toLeadColumns, type LeadRow } from "./lead-mapper";

export type LeadDb = SupabaseClient<Database>;

const TABLE = "leads";

/** Strips wildcard/delimiter characters before building PostgREST filters. */
function escapeLike(term: string): string {
  return sanitizeSearchTerm(term);
}

function fail(message: string, error: { message?: string } | null): never {
  throw new AppError(`${message}${error?.message ? `: ${error.message}` : ""}`, {
    code: "DB_ERROR",
    status: 500,
  });
}

/**
 * Data access for leads. Every query is scoped to `userId` in addition to the
 * database row-level security policies (defense in depth).
 */
export class LeadRepository {
  constructor(
    private readonly db: LeadDb,
    private readonly userId: string,
  ) {}

  async list(params: ListLeadsParams): Promise<LeadListResult> {
    const { page, pageSize, search, status, hasWebsite, city } = params;
    const from = (page - 1) * pageSize;

    let query = this.db
      .from(TABLE)
      .select("*", { count: "exact" })
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    const term = escapeLike(search);
    if (term.length > 0) {
      query = query.or(
        [
          `company_name.ilike.%${term}%`,
          `business_category.ilike.%${term}%`,
          `city.ilike.%${term}%`,
          `email.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
        ].join(","),
      );
    }
    if (status) query = query.eq("status", status);
    if (typeof hasWebsite === "boolean") query = query.eq("has_website", hasWebsite);
    if (city.length > 0) query = query.ilike("city", `%${escapeLike(city)}%`);

    const { data, error, count } = await query;
    if (error) fail("Não foi possível carregar os leads", error);

    const total = count ?? 0;
    return {
      items: ((data ?? []) as LeadRow[]).map(toLead),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findById(id: string): Promise<Lead> {
    const { data, error } = await this.db
      .from(TABLE)
      .select("*")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();

    if (error) fail("Não foi possível carregar o lead", error);
    if (!data) throw new NotFoundError("Lead não encontrado");
    return toLead(data as LeadRow);
  }

  async create(input: LeadInput): Promise<Lead> {
    const { data, error } = await this.db
      .from(TABLE)
      .insert({ ...toLeadColumns(input), user_id: this.userId })
      .select("*")
      .single();

    if (error) fail("Não foi possível criar o lead", error);
    return toLead(data as LeadRow);
  }

  async update(id: string, input: LeadInput): Promise<Lead> {
    const { data, error } = await this.db
      .from(TABLE)
      .update(toLeadColumns(input))
      .eq("user_id", this.userId)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) fail("Não foi possível atualizar o lead", error);
    if (!data) throw new NotFoundError("Lead não encontrado");
    return toLead(data as LeadRow);
  }

  async remove(id: string): Promise<{ id: string }> {
    const { data, error } = await this.db
      .from(TABLE)
      .delete()
      .eq("user_id", this.userId)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) fail("Não foi possível excluir o lead", error);
    if (!data) throw new NotFoundError("Lead não encontrado");
    return { id: (data as { id: string }).id };
  }

  async stats(): Promise<LeadStats> {
    const { data, error } = await this.db
      .from(TABLE)
      .select("status, has_website")
      .eq("user_id", this.userId);

    if (error) fail("Não foi possível carregar as estatísticas", error);

    const rows = (data ?? []) as Array<{ status: LeadStatus; has_website: boolean }>;
    const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<
      LeadStatus,
      number
    >;

    let withoutWebsite = 0;
    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      if (!row.has_website) withoutWebsite += 1;
    }

    return {
      total: rows.length,
      open: OPEN_LEAD_STATUSES.reduce((sum, s) => sum + byStatus[s], 0),
      won: byStatus.WON,
      withoutWebsite,
      byStatus,
    };
  }
}
