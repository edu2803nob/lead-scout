import { fetchPlaceDetails } from "@/services/google-places/places-api";
import type { GooglePlaceDetails } from "@/services/google-places/types";
import type { GoogleSignals } from "@/types/enrichment";

import type { EnrichmentContext, EnrichmentProvider, ProviderOutput } from "./provider";

export type PlaceDetailsFetcher = (placeId: string) => Promise<GooglePlaceDetails | null>;

/** Human-readable categories from the provider payload (no invented values). */
export function toGoogleCategories(details: GooglePlaceDetails | null): string[] {
  if (!details) return [];
  const primary = details.primaryTypeDisplayName?.text?.trim();
  const types = (details.types ?? [])
    .filter((type): type is string => typeof type === "string" && type.length > 0)
    .map((type) => type.replace(/_/g, " "))
    .filter((type) => type !== "point of interest" && type !== "establishment");

  return [...new Set([primary, ...types].filter((value): value is string => Boolean(value)))].slice(
    0,
    8,
  );
}

/** Maps place details into Google indicators, keeping nulls when absent. */
export function toGoogleSignals(
  placeId: string,
  details: GooglePlaceDetails | null,
): GoogleSignals {
  return {
    placeId,
    rating: typeof details?.rating === "number" ? details.rating : null,
    reviewCount: typeof details?.userRatingCount === "number" ? details.userRatingCount : null,
    categories: toGoogleCategories(details),
  };
}

/** Google Business indicators through the isolated Places access layer. */
export class GoogleProvider implements EnrichmentProvider {
  readonly id = "google";
  readonly label = "Google";

  constructor(private readonly fetcher: PlaceDetailsFetcher = fetchPlaceDetails) {}

  supports(context: EnrichmentContext): boolean {
    return Boolean(context.lead.googlePlaceId);
  }

  async enrich(context: EnrichmentContext): Promise<ProviderOutput> {
    const placeId = context.lead.googlePlaceId;
    if (!placeId) {
      return {
        patch: {},
        status: "SKIPPED",
        message: "Lead sem identificador do Google (prospecte ou informe o local).",
      };
    }

    const details = await this.fetcher(placeId);
    if (!details) {
      return { patch: {}, status: "SKIPPED", message: "O Google não retornou dados deste local." };
    }

    return {
      patch: { google: toGoogleSignals(placeId, details) },
      status: "OK",
      message: "Avaliações e categorias atualizadas.",
    };
  }
}
