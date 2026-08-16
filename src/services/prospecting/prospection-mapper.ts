import type { Database } from "@/integrations/supabase/types";
import type { PlaceResult, Prospection, ProspectionResult } from "@/types/prospecting";

export type ProspectionRow = Database["public"]["Tables"]["prospections"]["Row"];
export type ProspectionResultRow = Database["public"]["Tables"]["prospection_results"]["Row"];

export function toProspection(row: ProspectionRow): Prospection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    provider: row.provider,
    category: row.category,
    subcategory: row.subcategory,
    city: row.city,
    state: row.state,
    neighborhood: row.neighborhood,
    radius: row.radius,
    requestedLimit: row.requested_limit,
    status: row.status,
    foundCount: row.found_count,
    importedCount: row.imported_count,
    errorMessage: row.error_message,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toProspectionResult(row: ProspectionResultRow): ProspectionResult {
  return {
    id: row.id,
    prospectionId: row.prospection_id,
    leadId: row.lead_id,
    imported: row.imported,
    createdAt: row.created_at,
    placeId: row.google_place_id ?? "",
    name: row.name ?? "",
    address: row.address,
    phone: row.phone,
    websiteUrl: row.website_url,
    rating: row.rating === null ? null : Number(row.rating),
    reviewCount: row.review_count,
    providerCategory: row.provider_category,
    city: row.city,
    state: row.state,
    neighborhood: row.neighborhood,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

/** Domain place -> persistence columns for a prospection result. */
export function toResultColumns(place: PlaceResult) {
  return {
    google_place_id: place.placeId,
    name: place.name,
    address: place.address,
    phone: place.phone,
    website_url: place.websiteUrl,
    rating: place.rating,
    review_count: place.reviewCount,
    provider_category: place.providerCategory,
    city: place.city,
    state: place.state,
    neighborhood: place.neighborhood,
    latitude: place.latitude,
    longitude: place.longitude,
    raw_payload: {},
  };
}
