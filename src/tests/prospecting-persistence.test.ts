import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlacesApiError, searchTextPage } from "@/services/google-places/places-api";
import { ProspectionImporter } from "@/services/prospecting/lead-import";
import type { Prospection, ProspectionResult } from "@/types/prospecting";

/**
 * Minimal fake of the PostgREST query builder: only the calls used by the
 * import path, so persistence behaviour can be asserted without a database.
 */
interface FakeState {
  existing: Array<{ id: string; google_place_id: string }>;
  inserted: Array<Record<string, unknown>>;
  updated: Array<{ id: string; patch: Record<string, unknown> }>;
  insertError: { code: string; message: string } | null;
}

function fakeDb(state: FakeState) {
  return {
    from(table: string) {
      if (table !== "leads") throw new Error(`unexpected table ${table}`);
      const ctx: {
        rows?: Record<string, unknown>[];
        id?: string;
        patch?: Record<string, unknown>;
      } = {};

      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          if (column === "id") ctx.id = value;
          return builder;
        },
        in: (_column: string, values: string[]) => ({
          data: state.existing.filter((row) => values.includes(row.google_place_id)),
          error: null,
        }),
        insert: (row: Record<string, unknown>) => {
          ctx.rows = [row];
          return builder;
        },
        update: (patch: Record<string, unknown>) => {
          ctx.patch = patch;
          return Object.assign(builder, {
            then: (resolve: (value: { error: null }) => void) => {
              state.updated.push({ id: ctx.id ?? "", patch });
              resolve({ error: null });
            },
          });
        },
        single: () => {
          if (state.insertError) return { data: null, error: state.insertError };
          const row = ctx.rows?.[0] ?? {};
          state.inserted.push(row);
          return { data: { id: `lead-${state.inserted.length}` }, error: null };
        },
      } as Record<string, unknown>;

      return builder as never;
    },
  } as never;
}

const prospection: Prospection = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "user-1",
  name: "Loja de carros · Fortaleza/CE",
  provider: "GOOGLE_PLACES",
  category: "Automotivo",
  subcategory: "Loja de carros",
  city: "Fortaleza",
  state: "CE",
  neighborhood: null,
  radius: 10,
  requestedLimit: 100,
  status: "COMPLETED",
  foundCount: 2,
  importedCount: 0,
  errorMessage: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function result(id: string, placeId: string): ProspectionResult {
  return {
    id,
    prospectionId: prospection.id,
    leadId: null,
    imported: false,
    createdAt: new Date().toISOString(),
    placeId,
    name: `Empresa ${placeId}`,
    address: "Rua A",
    phone: null,
    websiteUrl: null,
    rating: 4,
    reviewCount: 5,
    providerCategory: "Concessionária",
    city: "Fortaleza",
    state: "CE",
    neighborhood: "Centro",
    latitude: -3.7,
    longitude: -38.5,
  };
}

describe("prospection import persistence", () => {
  it("creates new leads, updates duplicates and marks results", async () => {
    const state: FakeState = {
      existing: [{ id: "lead-existing", google_place_id: "place-a" }],
      inserted: [],
      updated: [],
      insertError: null,
    };
    const marked: Array<[string, string]> = [];

    const summary = await new ProspectionImporter(fakeDb(state), "user-1").run(
      prospection,
      [result("r1", "place-a"), result("r2", "place-b")],
      async (resultId, leadId) => {
        marked.push([resultId, leadId]);
      },
    );

    expect(summary).toEqual({ created: 1, updated: 1, skipped: 0 });
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]?.["google_place_id"]).toBe("place-b");
    expect(state.inserted[0]?.["user_id"]).toBe("user-1");
    expect(state.updated[0]?.id).toBe("lead-existing");
    expect(marked).toHaveLength(2);
  });

  it("does not import anything when there are no results", async () => {
    const state: FakeState = { existing: [], inserted: [], updated: [], insertError: null };
    const summary = await new ProspectionImporter(fakeDb(state), "user-1").run(
      prospection,
      [],
      async () => {},
    );
    expect(summary).toEqual({ created: 0, updated: 0, skipped: 0 });
  });
});

describe("google places API errors", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env["LOVABLE_API_KEY"] = "test-lovable-key";
    process.env["GOOGLE_MAPS_API_KEY"] = "test-connection-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("maps quota errors to a friendly message", async () => {
    globalThis.fetch = vi.fn(async () => new Response("quota exceeded", { status: 429 })) as never;
    await expect(searchTextPage({ textQuery: "x", pageSize: 5 })).rejects.toMatchObject({
      name: "PlacesApiError",
      status: 429,
    });
  });

  it("maps denied access to a 403 app error", async () => {
    globalThis.fetch = vi.fn(async () => new Response("denied", { status: 403 })) as never;
    await expect(searchTextPage({ textQuery: "x", pageSize: 5 })).rejects.toBeInstanceOf(
      PlacesApiError,
    );
  });

  it("maps network timeouts to a 504 app error", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new DOMException("The operation was aborted", "TimeoutError");
    }) as never;
    await expect(searchTextPage({ textQuery: "x", pageSize: 5 })).rejects.toMatchObject({
      status: 504,
    });
  });

  it("fails safely when credentials are missing", async () => {
    delete process.env["GOOGLE_MAPS_API_KEY"];
    await expect(searchTextPage({ textQuery: "x", pageSize: 5 })).rejects.toMatchObject({
      status: 503,
    });
  });
});
