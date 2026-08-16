import type { WebsiteQuality, WebsiteSignals } from "@/types/enrichment";
import { EMPTY_WEBSITE_SIGNALS } from "@/types/enrichment";

import type { EnrichmentContext, EnrichmentProvider, ProviderOutput } from "./provider";
import {
  inspectWebsite,
  normalizeWebsiteUrl,
  SiteBlockedError,
  type FetchLike,
} from "./site-inspector";

export interface WebsiteQualityInput {
  hasWebsite: boolean;
  reachable: boolean | null;
  secure: boolean | null;
  hasTitle: boolean | null;
  hasDescription: boolean | null;
  responsive: boolean | null;
  hasContactChannel: boolean | null;
}

/**
 * Deterministic website quality classification.
 * Never guesses: an unverifiable site stays `UNKNOWN`.
 */
export function classifyWebsiteQuality(input: WebsiteQualityInput): WebsiteQuality {
  if (!input.hasWebsite) return "NO_WEBSITE";
  if (input.reachable === null) return "UNKNOWN";
  if (input.reachable === false) return "WEAK";

  const points = [
    input.secure,
    input.hasTitle,
    input.hasDescription,
    input.responsive,
    input.hasContactChannel,
  ].filter((value) => value === true).length;

  if (points >= 5) return "EXCELLENT";
  if (points >= 4) return "GOOD";
  if (points >= 2) return "AVERAGE";
  return "WEAK";
}

/** Reads the lead's own website (robots-aware, one page, short timeout). */
export class WebsiteProvider implements EnrichmentProvider {
  readonly id = "website";
  readonly label = "Website";

  constructor(private readonly fetchImpl?: FetchLike) {}

  supports(context: EnrichmentContext): boolean {
    return normalizeWebsiteUrl(context.lead.websiteUrl) !== null;
  }

  async enrich(context: EnrichmentContext): Promise<ProviderOutput> {
    const url = normalizeWebsiteUrl(context.lead.websiteUrl);
    const checkedAt = context.now.toISOString();

    if (!url) {
      const website: WebsiteSignals = {
        ...EMPTY_WEBSITE_SIGNALS,
        hasWebsite: false,
        quality: "NO_WEBSITE",
        checkedAt,
      };
      return { patch: { website }, status: "OK", message: "Lead sem site cadastrado." };
    }

    let snapshot;
    try {
      snapshot = await inspectWebsite(url.toString(), {
        ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {}),
      });
    } catch (error) {
      if (error instanceof SiteBlockedError) {
        return {
          patch: {
            website: {
              ...EMPTY_WEBSITE_SIGNALS,
              hasWebsite: true,
              url: url.toString(),
              quality: "UNKNOWN",
              reachable: null,
              checkedAt,
            },
          },
          status: "SKIPPED",
          message: error.message,
        };
      }
      throw error;
    }

    if (!snapshot) {
      return {
        patch: {
          website: {
            ...EMPTY_WEBSITE_SIGNALS,
            hasWebsite: true,
            url: url.toString(),
            quality: "UNKNOWN",
            reachable: null,
            checkedAt,
          },
        },
        status: "SKIPPED",
        message: "Não foi possível acessar o site no momento.",
      };
    }

    const reachable = snapshot.statusCode >= 200 && snapshot.statusCode < 400;
    const website: WebsiteSignals = {
      hasWebsite: true,
      url: snapshot.finalUrl,
      reachable,
      statusCode: snapshot.statusCode,
      secure: snapshot.secure,
      hasTitle: reachable ? Boolean(snapshot.title) : null,
      hasDescription: reachable ? Boolean(snapshot.description) : null,
      responsive: reachable ? snapshot.responsive : null,
      hasContactChannel: reachable ? snapshot.hasContactChannel : null,
      title: snapshot.title,
      description: snapshot.description,
      quality: classifyWebsiteQuality({
        hasWebsite: true,
        reachable,
        secure: snapshot.secure,
        hasTitle: Boolean(snapshot.title),
        hasDescription: Boolean(snapshot.description),
        responsive: snapshot.responsive,
        hasContactChannel: snapshot.hasContactChannel,
      }),
      checkedAt,
    };

    return {
      patch: { website },
      snapshot,
      status: "OK",
      message: reachable
        ? "Site analisado com sucesso."
        : `Site respondeu com status ${snapshot.statusCode}.`,
    };
  }
}
