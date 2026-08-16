import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { AppError } from "@/lib/errors";
import type {
  ImportSummary,
  PlaceResult,
  Prospection,
  ProspectionResult,
} from "@/types/prospecting";

type Db = SupabaseClient<Database>;

export const PROSPECTING_SOURCE = "GOOGLE_PLACES";

export interface ImportPlan {
  toCreate: ProspectionResult[];
  toUpdate: Array<{ result: ProspectionResult; leadId: string }>;
  skipped: ProspectionResult[];
}

/**
 * Deduplication rule: one lead per `googlePlaceId` per user.
 * Existing places are updated (never duplicated); results without a place id
 * cannot be deduplicated safely and are skipped.
 */
export function planImport(
  results: ProspectionResult[],
  existingByPlaceId: ReadonlyMap<string, string>,
): ImportPlan {
  const plan: ImportPlan = { toCreate: [], toUpdate: [], skipped: [] };
  const seen = new Set<string>();

  for (const result of results) {
    const placeId = result.placeId?.trim();
    if (!placeId || !result.name?.trim()) {
      plan.skipped.push(result);
      continue;
    }
    if (seen.has(placeId)) {
      plan.skipped.push(result);
      continue;
    }
    seen.add(placeId);

    const leadId = existingByPlaceId.get(placeId);
    if (leadId) plan.toUpdate.push({ result, leadId });
    else plan.toCreate.push(result);
  }

  return plan;
}

/** Place -> lead columns. Origin is always recorded in `source`. */
export function toLeadColumnsFromPlace(
  place: PlaceResult,
  meta: { category: string | null; subcategory: string | null },
) {
  const hasWebsite = Boolean(place.websiteUrl);
  return {
    company_name: place.name,
    business_category: meta.category,
    business_subcategory: meta.subcategory ?? place.providerCategory,
    phone: place.phone,
    address: place.address,
    city: place.city,
    state: place.state,
    country: "BR",
    latitude: place.latitude,
    longitude: place.longitude,
    website_url: place.websiteUrl,
    has_website: hasWebsite,
    website_quality: hasWebsite ? ("UNKNOWN" as const) : ("NO_WEBSITE" as const),
    google_place_id: place.placeId,
    google_rating: place.rating,
    google_review_count: place.reviewCount,
    source: PROSPECTING_SOURCE,
  };
}

/** Fields refreshed when the lead already exists (never overwrites CRM state). */
export function toLeadRefreshColumns(place: PlaceResult) {
  const hasWebsite = Boolean(place.websiteUrl);
  return {
    phone: place.phone,
    address: place.address,
    city: place.city,
    state: place.state,
    latitude: place.latitude,
    longitude: place.longitude,
    website_url: place.websiteUrl,
    has_website: hasWebsite,
    google_rating: place.rating,
    google_review_count: place.reviewCount,
  };
}

function fail(message: string, error: { message?: string } | null): never {
  throw new AppError(`${message}${error?.message ? `: ${error.message}` : ""}`, {
    code: "DB_ERROR",
    status: 500,
  });
}

/** Persists an import plan, keeping the CRM status/notes of existing leads. */
export class ProspectionImporter {
  constructor(
    private readonly db: Db,
    private readonly userId: string,
  ) {}

  async existingLeadsByPlaceId(placeIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (placeIds.length === 0) return map;

    const { data, error } = await this.db
      .from("leads")
      .select("id, google_place_id")
      .eq("user_id", this.userId)
      .in("google_place_id", placeIds);

    if (error) fail("Não foi possível verificar leads existentes", error);
    for (const row of (data ?? []) as Array<{ id: string; google_place_id: string | null }>) {
      if (row.google_place_id) map.set(row.google_place_id, row.id);
    }
    return map;
  }

  async run(
    prospection: Prospection,
    results: ProspectionResult[],
    onImported: (resultId: string, leadId: string) => Promise<void>,
  ): Promise<ImportSummary> {
    const placeIds = results.map((item) => item.placeId).filter((id) => id.length > 0);
    const existing = await this.existingLeadsByPlaceId(placeIds);
    const plan = planImport(results, existing);
    const meta = { category: prospection.category, subcategory: prospection.subcategory };

    let created = 0;
    for (const result of plan.toCreate) {
      const { data, error } = await this.db
        .from("leads")
        .insert({ ...toLeadColumnsFromPlace(result, meta), user_id: this.userId })
        .select("id")
        .single();

      if (error) {
        // Unique place-id race: treat as an update instead of failing the batch.
        if (error.code === "23505") {
          const again = await this.existingLeadsByPlaceId([result.placeId]);
          const leadId = again.get(result.placeId);
          if (leadId) plan.toUpdate.push({ result, leadId });
          continue;
        }
        fail("Não foi possível importar o lead", error);
      }

      created += 1;
      await onImported(result.id, (data as { id: string }).id);
    }

    let updated = 0;
    for (const { result, leadId } of plan.toUpdate) {
      const { error } = await this.db
        .from("leads")
        .update(toLeadRefreshColumns(result))
        .eq("user_id", this.userId)
        .eq("id", leadId);

      if (error) fail("Não foi possível atualizar o lead existente", error);
      updated += 1;
      await onImported(result.id, leadId);
    }

    return { created, updated, skipped: plan.skipped.length };
  }
}
