import { describe, expect, it } from "vitest";

import {
  toGoogleCategories,
  toGoogleSignals,
  GoogleProvider,
} from "@/services/enrichment/google-provider";
import {
  toLeadEnrichmentColumns,
  toSocialProfileColumns,
} from "@/services/enrichment/enrichment-mapper";
import { EnrichmentService } from "@/services/enrichment/enrichment-service";
import { mergePatches, type EnrichmentLead } from "@/services/enrichment/provider";
import {
  detectSocialProfile,
  extractWhatsappLinks,
  isPathAllowedByRobots,
  normalizeWebsiteUrl,
  parseSiteHtml,
} from "@/services/enrichment/site-inspector";
import { classifyActivity, SocialProvider } from "@/services/enrichment/social-provider";
import {
  classifyWebsiteQuality,
  WebsiteProvider,
} from "@/services/enrichment/website-provider";
import {
  WhatsappProvider,
  whatsappPhoneFromLink,
} from "@/services/enrichment/whatsapp-provider";
import type { EnrichmentPatch } from "@/types/enrichment";

const lead: EnrichmentLead = {
  id: "11111111-1111-4111-8111-111111111111",
  companyName: "Auto Center Alpha",
  websiteUrl: "autocenteralpha.com.br",
  hasWebsite: true,
  phone: "+5585999990000",
  googlePlaceId: "place-123",
  googleRating: null,
  googleReviewCount: null,
  businessCategory: "AUTOMOTIVO",
  instagramUrl: null,
  instagramUsername: null,
  instagramFollowers: null,
  instagramPostCount: null,
  instagramLastPostAt: null,
  hasWhatsapp: false,
};

const HTML = `<!doctype html><html><head>
<title>Auto Center Alpha</title>
<meta name="description" content="Oficina em Fortaleza">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head><body>
<a href="https://instagram.com/autocenteralpha">insta</a>
<a href="https://wa.me/5585999990000">whats</a>
<a href="tel:+5585999990000">ligar</a>
</body></html>`;

function htmlFetch(status = 200, body = HTML) {
  return async () =>
    new Response(body, { status, headers: { "content-type": "text/html" } }) as Response;
}

describe("website url normalization", () => {
  it("adds protocol and rejects invalid values", () => {
    expect(normalizeWebsiteUrl("site.com.br")?.protocol).toBe("https:");
    expect(normalizeWebsiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsiteUrl("localhost")).toBeNull();
    expect(normalizeWebsiteUrl("  ")).toBeNull();
  });
});

describe("robots.txt", () => {
  it("honours disallow for wildcard agents", () => {
    const robots = "User-agent: *\nDisallow: /";
    expect(isPathAllowedByRobots(robots, "/")).toBe(false);
  });

  it("prefers the longest matching rule", () => {
    const robots = "User-agent: *\nDisallow: /priv\nAllow: /priv/ok";
    expect(isPathAllowedByRobots(robots, "/priv/ok")).toBe(true);
    expect(isPathAllowedByRobots(robots, "/priv/x")).toBe(false);
  });

  it("allows everything when there is no applicable group", () => {
    expect(isPathAllowedByRobots("User-agent: googlebot\nDisallow: /", "/")).toBe(true);
  });
});

describe("html parsing", () => {
  it("extracts public metadata only", () => {
    const parsed = parseSiteHtml(HTML);
    expect(parsed.title).toBe("Auto Center Alpha");
    expect(parsed.description).toBe("Oficina em Fortaleza");
    expect(parsed.responsive).toBe(true);
    expect(parsed.hasContactChannel).toBe(true);
  });

  it("detects social profiles and ignores generic paths", () => {
    expect(detectSocialProfile("https://instagram.com/loja")).toMatchObject({
      network: "INSTAGRAM",
      username: "loja",
    });
    expect(detectSocialProfile("https://instagram.com/p/abc")?.username).toBeNull();
    expect(detectSocialProfile("https://example.com/loja")).toBeNull();
  });

  it("extracts only published whatsapp links", () => {
    expect(extractWhatsappLinks(["https://wa.me/5585999990000", "tel:+5585999990000"])).toHaveLength(
      1,
    );
  });
});

describe("classification", () => {
  it("classifies website quality deterministically", () => {
    expect(classifyWebsiteQuality({ hasWebsite: false } as never)).toBe("NO_WEBSITE");
    expect(
      classifyWebsiteQuality({
        hasWebsite: true,
        reachable: null,
        secure: null,
        hasTitle: null,
        hasDescription: null,
        responsive: null,
        hasContactChannel: null,
      }),
    ).toBe("UNKNOWN");
    expect(
      classifyWebsiteQuality({
        hasWebsite: true,
        reachable: true,
        secure: true,
        hasTitle: true,
        hasDescription: true,
        responsive: true,
        hasContactChannel: true,
      }),
    ).toBe("EXCELLENT");
    expect(
      classifyWebsiteQuality({
        hasWebsite: true,
        reachable: false,
        secure: true,
        hasTitle: true,
        hasDescription: true,
        responsive: true,
        hasContactChannel: true,
      }),
    ).toBe("WEAK");
  });

  it("classifies social activity from the last post", () => {
    const now = new Date("2026-01-31T00:00:00Z");
    const base = { followers: null, postCount: null, now };
    expect(classifyActivity({ ...base, lastPostAt: "2026-01-29T00:00:00Z" })).toBe("VERY_ACTIVE");
    expect(classifyActivity({ ...base, lastPostAt: "2026-01-10T00:00:00Z" })).toBe("ACTIVE");
    expect(classifyActivity({ ...base, lastPostAt: "2025-12-10T00:00:00Z" })).toBe("MODERATE");
    expect(classifyActivity({ ...base, lastPostAt: "2025-01-10T00:00:00Z" })).toBe("INACTIVE");
    expect(classifyActivity({ ...base, lastPostAt: null })).toBe("UNKNOWN");
  });
});

describe("providers", () => {
  it("website provider maps a reachable site", async () => {
    const provider = new WebsiteProvider(htmlFetch() as never);
    const output = await provider.enrich({ lead, now: new Date() });
    expect(output.patch.website?.quality).toBe("EXCELLENT");
    expect(output.snapshot?.socialLinks[0]?.network).toBe("INSTAGRAM");
    expect(output.snapshot?.whatsappLinks).toHaveLength(1);
  });

  it("website provider keeps UNKNOWN when the site cannot be read", async () => {
    const provider = new WebsiteProvider((async () => {
      throw new Error("network down");
    }) as never);
    const output = await provider.enrich({ lead, now: new Date() });
    expect(output.patch.website?.quality).toBe("UNKNOWN");
    expect(output.patch.website?.reachable).toBeNull();
    expect(output.status).toBe("SKIPPED");
  });

  it("google provider never invents ratings", async () => {
    const provider = new GoogleProvider(async () => null);
    const output = await provider.enrich({ lead, now: new Date() });
    expect(output.status).toBe("SKIPPED");
    expect(output.patch.google).toBeUndefined();
  });

  it("google provider maps rating, reviews and categories", async () => {
    const provider = new GoogleProvider(async () => ({
      rating: 4.6,
      userRatingCount: 128,
      primaryTypeDisplayName: { text: "Oficina mecânica" },
      types: ["car_repair", "point_of_interest", "establishment"],
    }));
    const output = await provider.enrich({ lead, now: new Date() });
    expect(output.patch.google).toEqual({
      placeId: "place-123",
      rating: 4.6,
      reviewCount: 128,
      categories: ["Oficina mecânica", "car repair"],
    });
    expect(toGoogleCategories(null)).toEqual([]);
    expect(toGoogleSignals("p1", null).rating).toBeNull();
  });

  it("social provider only uses published links", async () => {
    const provider = new SocialProvider();
    const output = await provider.enrich({
      lead,
      now: new Date(),
      snapshot: {
        finalUrl: "https://x.com",
        secure: true,
        statusCode: 200,
        title: null,
        description: null,
        responsive: true,
        hasContactChannel: true,
        socialLinks: [
          { network: "INSTAGRAM", url: "https://instagram.com/loja", username: "loja" },
        ],
        whatsappLinks: [],
      },
    });
    expect(output.patch.social?.[0]).toMatchObject({
      network: "INSTAGRAM",
      username: "loja",
      followers: null,
      activityLevel: "UNKNOWN",
    });
  });

  it("whatsapp provider never infers from a plain phone", async () => {
    const provider = new WhatsappProvider();
    expect(provider.supports({ lead, now: new Date() })).toBe(false);
    const output = await provider.enrich({ lead, now: new Date() });
    expect(output.status).toBe("SKIPPED");
    expect(whatsappPhoneFromLink("https://wa.me/5585999990000")).toBe("+5585999990000");
    expect(whatsappPhoneFromLink("https://wa.me/123")).toBeNull();
  });
});

describe("persistence mapping", () => {
  it("omits unknown values so existing data is preserved", () => {
    const patch: EnrichmentPatch = {
      website: {
        hasWebsite: true,
        url: "https://site.com",
        quality: "GOOD",
        reachable: true,
        statusCode: 200,
        secure: true,
        hasTitle: true,
        hasDescription: false,
        responsive: true,
        hasContactChannel: true,
        title: "Site",
        description: null,
        checkedAt: "2026-01-31T00:00:00Z",
      },
      google: { placeId: "p", rating: null, reviewCount: 10, categories: [] },
      whatsapp: { available: null, link: null, phone: null },
    };
    const columns = toLeadEnrichmentColumns(patch);
    expect(columns).toEqual({
      has_website: true,
      website_quality: "GOOD",
      website_url: "https://site.com",
      google_review_count: 10,
    });
  });

  it("maps social signals to profile columns", () => {
    expect(
      toSocialProfileColumns({
        network: "INSTAGRAM",
        profileUrl: "https://instagram.com/loja",
        username: "loja",
        followers: null,
        postCount: null,
        lastPostAt: null,
        activityLevel: "UNKNOWN",
      }),
    ).toMatchObject({ network: "INSTAGRAM", followers: null, activity_level: "UNKNOWN" });
  });

  it("merges patches without letting nulls overwrite data", () => {
    const merged = mergePatches([
      { whatsapp: { available: true, link: "https://wa.me/1", phone: "+1" } },
      { whatsapp: { available: null, link: null, phone: null } },
    ]);
    expect(merged.whatsapp).toEqual({ available: true, link: "https://wa.me/1", phone: "+1" });
  });
});

describe("enrichment service", () => {
  it("isolates provider failures and persists the merged result", async () => {
    const applied: unknown[] = [];
    const socials: unknown[] = [];
    const service = new EnrichmentService(
      {
        loadLead: async () => lead,
        applyPatch: async (_id, patch) => {
          applied.push(patch);
        },
        saveSocialProfiles: async (_id, profiles) => {
          socials.push(profiles);
        },
      },
      [
        {
          id: "broken",
          label: "Fonte instável",
          supports: () => true,
          enrich: async () => {
            throw new Error("provider exploded");
          },
        },
        {
          id: "ok",
          label: "Fonte válida",
          supports: () => true,
          enrich: async () => ({
            patch: {
              social: [
                {
                  network: "INSTAGRAM" as const,
                  profileUrl: "https://instagram.com/loja",
                  username: "loja",
                  followers: null,
                  postCount: null,
                  lastPostAt: null,
                  activityLevel: "UNKNOWN" as const,
                },
              ],
            },
            status: "OK" as const,
          }),
        },
      ],
    );

    const result = await service.enrich(lead.id, new Date("2026-01-31T00:00:00Z"));
    expect(result.providers.map((p) => p.status)).toEqual(["FAILED", "OK"]);
    expect(result.providers[0]?.message).not.toContain("provider exploded");
    expect(result.social).toHaveLength(1);
    expect(applied).toHaveLength(1);
    expect(socials).toHaveLength(1);
    expect(result.google.rating).toBeNull();
    expect(result.whatsapp.available).toBeNull();
  });
});
