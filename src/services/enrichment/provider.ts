import type { EnrichmentPatch, ProviderStatus, SocialSignals } from "@/types/enrichment";
import { ENRICHMENT_LIMITS } from "@/types/enrichment";

/**
 * Provider architecture.
 *
 * A provider is an isolated, replaceable source of indicators. New sources
 * (LLM, Instagram Graph API, WhatsApp Business API, ...) can be added later by
 * implementing `EnrichmentProvider` and registering it — no changes to the
 * service, the server functions or the UI.
 */

/** Minimal lead projection a provider is allowed to see. */
export interface EnrichmentLead {
  id: string;
  companyName: string;
  websiteUrl: string | null;
  hasWebsite: boolean;
  phone: string | null;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  businessCategory: string | null;
  instagramUrl: string | null;
  instagramUsername: string | null;
  instagramFollowers: number | null;
  instagramPostCount: number | null;
  instagramLastPostAt: string | null;
  hasWhatsapp: boolean;
}

/** Data discovered by earlier providers and shared with later ones. */
export interface SiteSnapshot {
  finalUrl: string;
  secure: boolean;
  statusCode: number;
  title: string | null;
  description: string | null;
  responsive: boolean;
  hasContactChannel: boolean;
  /** Links published on the lead's own website. */
  socialLinks: Array<{ network: SocialSignals["network"]; url: string; username: string | null }>;
  whatsappLinks: string[];
}

export interface EnrichmentContext {
  lead: EnrichmentLead;
  /** Present only after the website provider ran successfully. */
  snapshot?: SiteSnapshot | undefined;
  now: Date;
}

export interface ProviderOutput {
  patch: EnrichmentPatch;
  snapshot?: SiteSnapshot | undefined;
  /** Human-readable, user-safe summary of what the provider could read. */
  message?: string;
  status?: ProviderStatus;
}

export interface EnrichmentProvider {
  readonly id: string;
  readonly label: string;
  /** Cheap pre-check: providers must never throw here. */
  supports(context: EnrichmentContext): boolean;
  enrich(context: EnrichmentContext): Promise<ProviderOutput>;
}

/** Merges provider patches; later providers win only on non-null values. */
export function mergePatches(patches: EnrichmentPatch[]): EnrichmentPatch {
  const merged: EnrichmentPatch = {};
  const socialByNetwork = new Map<string, SocialSignals>();

  for (const patch of patches) {
    if (patch.website) merged.website = { ...merged.website, ...patch.website };
    if (patch.google) merged.google = { ...merged.google, ...patch.google };
    if (patch.whatsapp) {
      merged.whatsapp = {
        available: patch.whatsapp.available ?? merged.whatsapp?.available ?? null,
        link: patch.whatsapp.link ?? merged.whatsapp?.link ?? null,
        phone: patch.whatsapp.phone ?? merged.whatsapp?.phone ?? null,
      };
    }
    for (const profile of patch.social ?? []) {
      const current = socialByNetwork.get(profile.network);
      socialByNetwork.set(
        profile.network,
        current
          ? {
              network: profile.network,
              profileUrl: profile.profileUrl ?? current.profileUrl,
              username: profile.username ?? current.username,
              followers: profile.followers ?? current.followers,
              postCount: profile.postCount ?? current.postCount,
              lastPostAt: profile.lastPostAt ?? current.lastPostAt,
              activityLevel:
                profile.activityLevel === "UNKNOWN" ? current.activityLevel : profile.activityLevel,
            }
          : profile,
      );
    }
  }

  if (socialByNetwork.size > 0) {
    merged.social = [...socialByNetwork.values()].slice(0, ENRICHMENT_LIMITS.maxSocialProfiles);
  }
  return merged;
}
