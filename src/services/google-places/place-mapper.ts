import type { PlaceResult } from "@/types/prospecting";

import type { GooglePlace } from "./types";

/**
 * Pure mapping layer: provider payload -> domain `PlaceResult`.
 * Only business (public) data is kept; anything else is dropped on purpose.
 */

function component(place: GooglePlace, type: string): string | null {
  const match = place.addressComponents?.find((item) => item.types?.includes(type));
  return match?.shortText ?? match?.longText ?? null;
}

function trimmed(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, max);
  return clean.length > 0 ? clean : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Returns `null` when the payload cannot identify a business. */
export function mapPlace(place: GooglePlace | null | undefined): PlaceResult | null {
  if (!place) return null;
  const placeId = trimmed(place.id, 200);
  const name = trimmed(place.displayName?.text, 160);
  if (!placeId || !name) return null;

  const reviewCount = finiteNumber(place.userRatingCount);
  const rating = finiteNumber(place.rating);

  return {
    placeId,
    name,
    address: trimmed(place.formattedAddress, 240),
    phone: trimmed(place.nationalPhoneNumber ?? place.internationalPhoneNumber, 40),
    websiteUrl: trimmed(place.websiteUri, 500),
    rating: rating === null ? null : Math.min(5, Math.max(0, Math.round(rating * 10) / 10)),
    reviewCount: reviewCount === null ? null : Math.max(0, Math.trunc(reviewCount)),
    providerCategory: trimmed(place.primaryTypeDisplayName?.text, 120),
    city: component(place, "administrative_area_level_2") ?? component(place, "locality") ?? null,
    state: component(place, "administrative_area_level_1"),
    neighborhood:
      component(place, "sublocality_level_1") ?? component(place, "sublocality") ?? null,
    latitude: finiteNumber(place.location?.latitude),
    longitude: finiteNumber(place.location?.longitude),
  };
}

/** Maps a page of places, dropping invalid entries and duplicated place ids. */
export function mapPlaces(places: ReadonlyArray<GooglePlace> | null | undefined): PlaceResult[] {
  const seen = new Set<string>();
  const out: PlaceResult[] = [];
  for (const raw of places ?? []) {
    const mapped = mapPlace(raw);
    if (!mapped || seen.has(mapped.placeId)) continue;
    seen.add(mapped.placeId);
    out.push(mapped);
  }
  return out;
}

/** Builds the human-readable text query sent to the provider. */
export function buildTextQuery(input: {
  category: string;
  subcategory?: string | null;
  city: string;
  state: string;
  neighborhood?: string | null;
}): string {
  const what = input.subcategory?.trim() || input.category.trim();
  const where = [input.neighborhood?.trim(), input.city.trim(), input.state.trim()]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(", ");
  return `${what} em ${where}`.slice(0, 300);
}
