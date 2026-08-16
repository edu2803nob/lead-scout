import { describe, expect, it } from "vitest";

import { REDACTED, redactSecrets } from "@/lib/security/redact";
import { importProspectionSchema, startProspectionSchema } from "@/lib/validation/prospecting";
import { buildTextQuery, mapPlace, mapPlaces } from "@/services/google-places/place-mapper";
import type { GooglePlace } from "@/services/google-places/types";
import {
  planImport,
  toLeadColumnsFromPlace,
  toLeadRefreshColumns,
} from "@/services/prospecting/lead-import";
import { PROSPECTION_LIMITS } from "@/types/prospecting";
import type { ProspectionResult } from "@/types/prospecting";

const rawPlace: GooglePlace = {
  id: "ChIJ_place_1",
  displayName: { text: "LifeCar Veículos" },
  formattedAddress: "Av. Rogaciano Leite, 1020 - Guararapes, Fortaleza - CE",
  nationalPhoneNumber: "(85) 3032-5556",
  internationalPhoneNumber: "+55 85 3032-5556",
  websiteUri: "http://lifecar.com.br/",
  rating: 4.83,
  userRatingCount: 457.7,
  primaryTypeDisplayName: { text: "Concessionária" },
  location: { latitude: -3.76, longitude: -38.49 },
  addressComponents: [
    { longText: "Guararapes", shortText: "Guararapes", types: ["sublocality_level_1"] },
    { longText: "Fortaleza", shortText: "Fortaleza", types: ["administrative_area_level_2"] },
    { longText: "Ceará", shortText: "CE", types: ["administrative_area_level_1"] },
  ],
};

function result(overrides: Partial<ProspectionResult> = {}): ProspectionResult {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    prospectionId: "22222222-2222-4222-8222-222222222222",
    leadId: null,
    imported: false,
    createdAt: new Date().toISOString(),
    placeId: "place-a",
    name: "Empresa A",
    address: "Rua A",
    phone: "(85) 90000-0000",
    websiteUrl: null,
    rating: 4.5,
    reviewCount: 10,
    providerCategory: "Concessionária",
    city: "Fortaleza",
    state: "CE",
    neighborhood: "Centro",
    latitude: -3.7,
    longitude: -38.5,
    ...overrides,
  };
}

describe("google places mapper", () => {
  it("maps only the required fields", () => {
    const mapped = mapPlace(rawPlace);
    expect(mapped).toEqual({
      placeId: "ChIJ_place_1",
      name: "LifeCar Veículos",
      address: "Av. Rogaciano Leite, 1020 - Guararapes, Fortaleza - CE",
      phone: "(85) 3032-5556",
      websiteUrl: "http://lifecar.com.br/",
      rating: 4.8,
      reviewCount: 457,
      providerCategory: "Concessionária",
      city: "Fortaleza",
      state: "CE",
      neighborhood: "Guararapes",
      latitude: -3.76,
      longitude: -38.49,
    });
  });

  it("rejects payloads without id or name", () => {
    expect(mapPlace({ ...rawPlace, id: null })).toBeNull();
    expect(mapPlace({ ...rawPlace, displayName: { text: "  " } })).toBeNull();
    expect(mapPlace(undefined)).toBeNull();
  });

  it("drops duplicates and invalid entries in a page", () => {
    const mapped = mapPlaces([rawPlace, rawPlace, { id: "x" }, null as never]);
    expect(mapped).toHaveLength(1);
  });

  it("builds a bounded text query preferring the subcategory", () => {
    expect(
      buildTextQuery({
        category: "Automotivo",
        subcategory: "Loja de carros",
        city: "Fortaleza",
        state: "CE",
        neighborhood: null,
      }),
    ).toBe("Loja de carros em Fortaleza, CE");

    expect(
      buildTextQuery({ category: "Automotivo", city: "Fortaleza", state: "CE" }).startsWith(
        "Automotivo em",
      ),
    ).toBe(true);

    expect(
      buildTextQuery({ category: "x".repeat(500), city: "Fortaleza", state: "CE" }).length,
    ).toBeLessThanOrEqual(300);
  });

  it("keeps rating and review count within safe ranges", () => {
    const mapped = mapPlace({ ...rawPlace, rating: 9, userRatingCount: -5 });
    expect(mapped?.rating).toBe(5);
    expect(mapped?.reviewCount).toBe(0);
  });
});

describe("deduplication by googlePlaceId", () => {
  it("updates existing places and creates only new ones", () => {
    const existing = new Map([["place-a", "lead-a"]]);
    const plan = planImport([result(), result({ id: "id-b", placeId: "place-b" })], existing);

    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0]?.leadId).toBe("lead-a");
    expect(plan.toCreate.map((item) => item.placeId)).toEqual(["place-b"]);
  });

  it("never imports the same place twice in a batch", () => {
    const plan = planImport([result(), result({ id: "dup" })], new Map());
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.skipped).toHaveLength(1);
  });

  it("skips results without place id or name", () => {
    const plan = planImport([result({ placeId: "" }), result({ id: "b", name: " " })], new Map());
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.skipped).toHaveLength(2);
  });
});

describe("persistence mapping", () => {
  it("records origin and website quality on create", () => {
    const columns = toLeadColumnsFromPlace(result(), {
      category: "Automotivo",
      subcategory: "Loja de carros",
    });
    expect(columns.source).toBe("GOOGLE_PLACES");
    expect(columns.google_place_id).toBe("place-a");
    expect(columns.has_website).toBe(false);
    expect(columns.website_quality).toBe("NO_WEBSITE");
    expect(columns.business_subcategory).toBe("Loja de carros");
  });

  it("falls back to the provider category when no subcategory is set", () => {
    const columns = toLeadColumnsFromPlace(result(), { category: "Automotivo", subcategory: null });
    expect(columns.business_subcategory).toBe("Concessionária");
  });

  it("refresh columns never touch CRM state", () => {
    const refresh = toLeadRefreshColumns(result({ websiteUrl: "https://a.com" }));
    expect(refresh).not.toHaveProperty("status");
    expect(refresh).not.toHaveProperty("source");
    expect(refresh.has_website).toBe(true);
  });
});

describe("validation", () => {
  it("accepts a valid prospecting request", () => {
    const parsed = startProspectionSchema.parse({
      category: "Automotivo",
      subcategory: "Loja de carros",
      city: "Fortaleza",
      state: "CE",
      radiusKm: 10,
      limit: 100,
    });
    expect(parsed.limit).toBe(100);
    expect(parsed.neighborhood).toBeNull();
  });

  it("rejects out-of-range radius and quantity", () => {
    const base = { category: "Automotivo", city: "Fortaleza", state: "CE", limit: 10 };
    expect(startProspectionSchema.safeParse({ ...base, radiusKm: 0 }).success).toBe(false);
    expect(startProspectionSchema.safeParse({ ...base, radiusKm: 999 }).success).toBe(false);
    expect(
      startProspectionSchema.safeParse({
        ...base,
        radiusKm: 10,
        limit: PROSPECTION_LIMITS.maxResults + 1,
      }).success,
    ).toBe(false);
  });

  it("rejects missing city/category", () => {
    expect(
      startProspectionSchema.safeParse({
        category: "A",
        city: "",
        state: "CE",
        radiusKm: 5,
        limit: 5,
      }).success,
    ).toBe(false);
  });

  it("sanitizes injected markup in free text", () => {
    const parsed = startProspectionSchema.parse({
      category: "<script>alert(1)</script>Automotivo",
      city: "Fortaleza",
      state: "CE",
      radiusKm: 5,
      limit: 5,
    });
    expect(parsed.category).not.toContain("<script>");
  });

  it("rejects invalid identifiers on import", () => {
    expect(importProspectionSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
    expect(
      importProspectionSchema.safeParse({
        id: "22222222-2222-4222-8222-222222222222",
        resultIds: ["nope"],
      }).success,
    ).toBe(false);
  });
});

describe("provider error handling", () => {
  it("never leaks credentials in provider log output", () => {
    const body = "API keys: Bearer abcdef1234567890 and sk-abcdefghijklmnopqrstuvwx";
    const safe = redactSecrets(body);
    expect(safe).not.toContain("abcdef1234567890");
    expect(safe).toContain(REDACTED);
  });

  it("keeps request limits configurable and bounded", () => {
    expect(PROSPECTION_LIMITS.pageSize).toBeLessThanOrEqual(20);
    expect(PROSPECTION_LIMITS.maxPages * PROSPECTION_LIMITS.pageSize).toBeGreaterThanOrEqual(
      PROSPECTION_LIMITS.maxResults,
    );
    expect(PROSPECTION_LIMITS.requestTimeoutMs).toBeGreaterThan(0);
  });
});
