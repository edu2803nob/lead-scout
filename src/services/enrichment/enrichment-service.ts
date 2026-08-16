import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { redactSecrets } from "@/lib/security/redact";
import type { EnrichmentPatch, EnrichmentResult, ProviderOutcome } from "@/types/enrichment";
import {
  EMPTY_GOOGLE_SIGNALS,
  EMPTY_WEBSITE_SIGNALS,
  EMPTY_WHATSAPP_SIGNALS,
} from "@/types/enrichment";

import { EnrichmentRepository } from "./enrichment-repository";
import { GoogleProvider } from "./google-provider";
import {
  mergePatches,
  type EnrichmentContext,
  type EnrichmentLead,
  type EnrichmentProvider,
} from "./provider";
import { SocialProvider } from "./social-provider";
import { WebsiteProvider } from "./website-provider";
import { WhatsappProvider } from "./whatsapp-provider";

type Db = SupabaseClient<Database>;

/**
 * Default provider pipeline. Order matters: the website provider publishes a
 * snapshot that the social and WhatsApp providers reuse (one polite fetch).
 * Register new sources here — nothing else changes.
 */
export function defaultProviders(): EnrichmentProvider[] {
  return [new WebsiteProvider(), new GoogleProvider(), new SocialProvider(), new WhatsappProvider()];
}

export interface EnrichmentRunner {
  loadLead(leadId: string): Promise<EnrichmentLead>;
  applyPatch(leadId: string, patch: EnrichmentPatch): Promise<void>;
  saveSocialProfiles(leadId: string, profiles: EnrichmentResult["social"]): Promise<void>;
}

/**
 * Orchestrates the provider pipeline.
 *
 * - a failing provider never breaks the run (isolated try/catch);
 * - nothing is invented: absent data stays `null` / `UNKNOWN`;
 * - all business logic lives here, never in React components.
 */
export class EnrichmentService {
  private readonly providers: EnrichmentProvider[];

  constructor(
    private readonly repo: EnrichmentRunner,
    providers: EnrichmentProvider[] = defaultProviders(),
  ) {
    this.providers = providers;
  }

  static forUser(db: Db, userId: string, providers?: EnrichmentProvider[]): EnrichmentService {
    return new EnrichmentService(new EnrichmentRepository(db, userId), providers);
  }

  async enrich(leadId: string, now: Date = new Date()): Promise<EnrichmentResult> {
    const lead = await this.repo.loadLead(leadId);
    const context: EnrichmentContext = { lead, now };

    const patches: EnrichmentPatch[] = [];
    const outcomes: ProviderOutcome[] = [];

    for (const provider of this.providers) {
      if (!provider.supports(context)) {
        outcomes.push({
          provider: provider.id,
          label: provider.label,
          status: "SKIPPED",
          message: "Sem dados suficientes para esta fonte.",
        });
        continue;
      }

      try {
        const output = await provider.enrich(context);
        patches.push(output.patch);
        if (output.snapshot) context.snapshot = output.snapshot;
        outcomes.push({
          provider: provider.id,
          label: provider.label,
          status: output.status ?? "OK",
          message: output.message ?? "Concluído.",
        });
      } catch (error) {
        console.error(
          `[enrichment] provider ${provider.id} failed: ${redactSecrets(
            error instanceof Error ? error.message : String(error),
          ).slice(0, 300)}`,
        );
        outcomes.push({
          provider: provider.id,
          label: provider.label,
          status: "FAILED",
          message: "Não foi possível consultar esta fonte agora.",
        });
      }
    }

    const merged = mergePatches(patches);

    await this.repo.applyPatch(leadId, merged);
    if (merged.social?.length) await this.repo.saveSocialProfiles(leadId, merged.social);

    return {
      leadId,
      website: merged.website ?? {
        ...EMPTY_WEBSITE_SIGNALS,
        hasWebsite: lead.hasWebsite,
        url: lead.websiteUrl,
        quality: lead.hasWebsite ? "UNKNOWN" : "NO_WEBSITE",
      },
      social: merged.social ?? [],
      google: merged.google ?? {
        ...EMPTY_GOOGLE_SIGNALS,
        placeId: lead.googlePlaceId,
        rating: lead.googleRating,
        reviewCount: lead.googleReviewCount,
      },
      whatsapp: merged.whatsapp ?? {
        ...EMPTY_WHATSAPP_SIGNALS,
        available: lead.hasWhatsapp ? true : null,
      },
      providers: outcomes,
      enrichedAt: now.toISOString(),
    };
  }
}
