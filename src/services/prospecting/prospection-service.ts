import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { redactSecrets } from "@/lib/security/redact";
import type { ImportProspectionInput, StartProspectionInput } from "@/lib/validation/prospecting";
import { buildTextQuery, mapPlaces } from "@/services/google-places/place-mapper";
import { geocodeArea, PlacesApiError, searchTextPage } from "@/services/google-places/places-api";
import type { GoogleSearchTextResponse } from "@/services/google-places/types";
import { PROSPECTION_LIMITS } from "@/types/prospecting";
import type { ImportSummary, Prospection, ProspectionDetail } from "@/types/prospecting";

import { ProspectionImporter } from "./lead-import";
import { ProspectionRepository } from "./prospection-repository";

type Db = SupabaseClient<Database>;

export interface ProspectionDeps {
  /** Injected for tests; defaults to the real Google Places layer. */
  searchPage?: typeof searchTextPage;
  geocode?: typeof geocodeArea;
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function prospectionName(input: StartProspectionInput): string {
  const what = input.subcategory ?? input.category;
  return `${what} · ${input.city}/${input.state}`.slice(0, 160);
}

/**
 * Orchestrates a prospection run: provider pagination, page-by-page
 * persistence, cancellation checks and safe error handling.
 */
export class ProspectionService {
  private readonly repo: ProspectionRepository;
  private readonly searchPage: typeof searchTextPage;
  private readonly geocode: typeof geocodeArea;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly db: Db,
    private readonly userId: string,
    deps: ProspectionDeps = {},
  ) {
    this.repo = new ProspectionRepository(db, userId);
    this.searchPage = deps.searchPage ?? searchTextPage;
    this.geocode = deps.geocode ?? geocodeArea;
    this.sleep = deps.sleep ?? wait;
  }

  async list(limit: number): Promise<Prospection[]> {
    return this.repo.list(limit);
  }

  async detail(id: string): Promise<ProspectionDetail> {
    const prospection = await this.repo.findById(id);
    const results = await this.repo.listResults(id);
    return { prospection, results };
  }

  async cancel(id: string): Promise<Prospection> {
    const current = await this.repo.findById(id);
    if (current.status !== "RUNNING" && current.status !== "PENDING") return current;
    return this.repo.patch(id, {
      status: "CANCELLED",
      completed_at: new Date().toISOString(),
    });
  }

  async start(input: StartProspectionInput): Promise<ProspectionDetail> {
    const prospection = await this.repo.create(input, prospectionName(input));

    try {
      const found = await this.run(prospection.id, input);
      const status =
        (await this.repo.status(prospection.id)) === "CANCELLED" ? "CANCELLED" : "COMPLETED";

      const updated = await this.repo.patch(prospection.id, {
        status,
        found_count: found,
        error_message: null,
        completed_at: new Date().toISOString(),
      });
      return { prospection: updated, results: await this.repo.listResults(prospection.id) };
    } catch (error) {
      console.error(
        `[prospecting] run failed: ${redactSecrets(error instanceof Error ? error.message : String(error))}`,
      );
      const message =
        error instanceof PlacesApiError
          ? error.message
          : "A prospecção falhou. Tente novamente em alguns instantes.";
      const found = await this.repo.countResults(prospection.id).catch(() => 0);
      const updated = await this.repo.patch(prospection.id, {
        status: "FAILED",
        found_count: found,
        error_message: message,
        completed_at: new Date().toISOString(),
      });
      return { prospection: updated, results: await this.repo.listResults(prospection.id) };
    }
  }

  /** Paginates the provider until the requested limit or the page cap. */
  private async run(prospectionId: string, input: StartProspectionInput): Promise<number> {
    const textQuery = buildTextQuery(input);
    const center = await this.geocode(
      [input.neighborhood, input.city, input.state, "Brasil"].filter(Boolean).join(", "),
    );
    const bias = center
      ? { ...center, radiusMeters: Math.min(50_000, input.radiusKm * 1000) }
      : null;

    let saved = 0;
    let pageToken: string | null = null;

    for (let page = 0; page < PROSPECTION_LIMITS.maxPages; page += 1) {
      if (saved >= input.limit) break;
      if (page > 0) {
        const status = await this.repo.status(prospectionId);
        if (status !== "RUNNING") break;
        await this.sleep(PROSPECTION_LIMITS.pageDelayMs);
      }

      const remaining = input.limit - saved;
      const response: GoogleSearchTextResponse = await this.searchPage({
        textQuery,
        pageSize: Math.min(PROSPECTION_LIMITS.pageSize, remaining),
        pageToken,
        bias,
      });

      const places = mapPlaces(response.places).slice(0, remaining);
      if (places.length > 0) saved += await this.repo.saveResults(prospectionId, places);

      pageToken = response.nextPageToken ?? null;
      if (!pageToken) break;
    }

    return this.repo.countResults(prospectionId);
  }

  async import(input: ImportProspectionInput): Promise<{
    prospection: Prospection;
    summary: ImportSummary;
  }> {
    const prospection = await this.repo.findById(input.id);
    const results = await this.repo.listResults(input.id, input.resultIds);
    const importer = new ProspectionImporter(this.db, this.userId);

    const summary = await importer.run(prospection, results, (resultId, leadId) =>
      this.repo.markImported(resultId, leadId),
    );

    const imported = summary.created + summary.updated;
    const updated =
      imported > 0
        ? await this.repo.patch(input.id, {
            imported_count: prospection.importedCount + imported,
          })
        : prospection;

    return { prospection: updated, summary };
  }
}
