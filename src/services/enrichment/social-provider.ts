import type { SocialActivity, SocialSignals } from "@/types/enrichment";

import type { EnrichmentContext, EnrichmentProvider, ProviderOutput } from "./provider";
import { detectSocialProfile } from "./site-inspector";

/**
 * Social indicators.
 *
 * Legal/technical boundary: platforms such as Instagram forbid scraping, so
 * profiles are only identified from links the company itself publishes (its own
 * website or data already stored for the lead). Follower/post/last-activity
 * metrics are filled ONLY when an authorized source already provided them —
 * otherwise they stay `null` and the activity level is `UNKNOWN`.
 */

export interface ActivityInput {
  followers: number | null;
  postCount: number | null;
  lastPostAt: string | null;
  now: Date;
}

const DAY_MS = 86_400_000;

/** Deterministic activity classification based on the last published post. */
export function classifyActivity(input: ActivityInput): SocialActivity {
  const timestamp = input.lastPostAt ? Date.parse(input.lastPostAt) : Number.NaN;

  if (Number.isFinite(timestamp)) {
    const days = Math.floor((input.now.getTime() - timestamp) / DAY_MS);
    if (days < 0) return "UNKNOWN";
    if (days <= 7) return "VERY_ACTIVE";
    if (days <= 30) return "ACTIVE";
    if (days <= 90) return "MODERATE";
    return "INACTIVE";
  }

  if (typeof input.postCount === "number" && input.postCount > 0) return "MODERATE";
  return "UNKNOWN";
}

export class SocialProvider implements EnrichmentProvider {
  readonly id = "social";
  readonly label = "Redes sociais";

  supports(context: EnrichmentContext): boolean {
    return Boolean(
      context.snapshot?.socialLinks.length ||
        context.lead.instagramUrl ||
        context.lead.instagramUsername,
    );
  }

  async enrich(context: EnrichmentContext): Promise<ProviderOutput> {
    const { lead, snapshot, now } = context;
    const profiles = new Map<string, SocialSignals>();

    for (const link of snapshot?.socialLinks ?? []) {
      profiles.set(link.network, {
        network: link.network,
        profileUrl: link.url,
        username: link.username,
        followers: null,
        postCount: null,
        lastPostAt: null,
        activityLevel: "UNKNOWN",
      });
    }

    // Instagram data already stored for this lead (authorized source).
    const storedUrl = lead.instagramUrl ?? null;
    const detected = storedUrl ? detectSocialProfile(storedUrl) : null;
    if (storedUrl || lead.instagramUsername) {
      const current = profiles.get("INSTAGRAM");
      profiles.set("INSTAGRAM", {
        network: "INSTAGRAM",
        profileUrl: storedUrl ?? current?.profileUrl ?? null,
        username: lead.instagramUsername ?? detected?.username ?? current?.username ?? null,
        followers: lead.instagramFollowers,
        postCount: lead.instagramPostCount,
        lastPostAt: lead.instagramLastPostAt,
        activityLevel: "UNKNOWN",
      });
    }

    const social = [...profiles.values()].map((profile) => ({
      ...profile,
      activityLevel: classifyActivity({
        followers: profile.followers,
        postCount: profile.postCount,
        lastPostAt: profile.lastPostAt,
        now,
      }),
    }));

    if (social.length === 0) {
      return { patch: {}, status: "SKIPPED", message: "Nenhum perfil social identificado." };
    }

    return {
      patch: { social },
      status: "OK",
      message: `${social.length} perfil(is) identificado(s) a partir de fontes públicas.`,
    };
  }
}
