import { describe, expect, it } from "vitest";

import { OPPORTUNITY_TYPES } from "@/config/opportunity";
import {
  calculateLandingPageOpportunity,
  classifyOpportunity,
  matchCategoryHints,
  progressive,
} from "@/services/opportunity/landing-page-opportunity";
import { toOpportunityRows } from "@/services/opportunity/opportunity-mapper";
import { OpportunityService, type OpportunityStore } from "@/services/opportunity/opportunity-service";
import type { Lead } from "@/types/lead";
import type { LandingPageOpportunityResult, OpportunityLead } from "@/types/opportunity";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function lead(overrides: Partial<OpportunityLead> = {}): OpportunityLead {
  return {
    hasWebsite: false,
    websiteUrl: null,
    websiteQuality: "NO_WEBSITE",
    phone: null,
    email: null,
    hasWhatsapp: false,
    googleRating: null,
    googleReviewCount: null,
    instagramUrl: null,
    instagramUsername: null,
    instagramFollowers: null,
    instagramPostCount: null,
    instagramLastPostAt: null,
    businessModel: null,
    businessCategory: null,
    businessSubcategory: null,
    ...overrides,
  };
}

describe("landing page opportunity — bounds and determinism", () => {
  it("keeps the score inside 0-100 for an empty lead", () => {
    const result = calculateLandingPageOpportunity(lead(), NOW);
    expect(result.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(result.opportunityScore).toBeLessThanOrEqual(100);
  });

  it("never exceeds 100 for a maximal lead", () => {
    const result = calculateLandingPageOpportunity(
      lead({
        googleRating: 5,
        googleReviewCount: 100_000,
        instagramFollowers: 5_000_000,
        instagramLastPostAt: NOW.toISOString(),
        instagramUrl: "https://instagram.com/x",
        hasWhatsapp: true,
        phone: "+55 85 99999-9999",
        email: "a@b.com",
        businessModel: "LEAD_GENERATION",
        businessCategory: "Serviços",
        businessSubcategory: "Consultoria",
      }),
      NOW,
    );
    expect(result.opportunityScore).toBeLessThanOrEqual(100);
    result.opportunityTypes.forEach((item) => expect(item.score).toBeLessThanOrEqual(100));
  });

  it("is deterministic for the same input", () => {
    const input = lead({ googleReviewCount: 40, hasWhatsapp: true });
    expect(calculateLandingPageOpportunity(input, NOW)).toEqual(
      calculateLandingPageOpportunity(input, NOW),
    );
  });

  it("does not mutate the input lead", () => {
    const input = lead({ googleReviewCount: 12 });
    const snapshot = JSON.stringify(input);
    calculateLandingPageOpportunity(input, NOW);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("emits only known opportunity types", () => {
    const result = calculateLandingPageOpportunity(
      lead({ hasWhatsapp: true, googleReviewCount: 80, businessModel: "QUOTE" }),
      NOW,
    );
    result.opportunityTypes.forEach((item) =>
      expect(OPPORTUNITY_TYPES).toContain(item.type),
    );
  });
});

describe("gap dimension", () => {
  it("scores a lead without website higher than a lead with an excellent site", () => {
    const none = calculateLandingPageOpportunity(lead({ hasWhatsapp: true }), NOW);
    const strong = calculateLandingPageOpportunity(
      lead({ hasWebsite: true, websiteQuality: "EXCELLENT", hasWhatsapp: true }),
      NOW,
    );
    expect(none.opportunityScore).toBeGreaterThan(strong.opportunityScore);
    expect(none.opportunityTypes.map((t) => t.type)).toContain("NO_WEBSITE");
  });

  it("places a weak website between no website and a good website", () => {
    const weak = calculateLandingPageOpportunity(
      lead({ hasWebsite: true, websiteQuality: "WEAK", hasWhatsapp: true }),
      NOW,
    );
    const good = calculateLandingPageOpportunity(
      lead({ hasWebsite: true, websiteQuality: "GOOD", hasWhatsapp: true }),
      NOW,
    );
    expect(weak.opportunityTypes.map((t) => t.type)).toContain("WEAK_WEBSITE");
    expect(weak.opportunityScore).toBeGreaterThan(good.opportunityScore);
  });

  it("treats an unverified website as neutral, not as an opportunity type", () => {
    const result = calculateLandingPageOpportunity(
      lead({ hasWebsite: true, websiteQuality: "UNKNOWN" }),
      NOW,
    );
    expect(result.opportunityTypes.map((t) => t.type)).not.toContain("NO_WEBSITE");
    expect(result.evidence.map((e) => e.code)).toContain("WEBSITE_UNVERIFIED");
  });
});

describe("evidence requirement", () => {
  it("does not infer a need from the category alone", () => {
    const result = calculateLandingPageOpportunity(
      lead({
        hasWebsite: true,
        websiteQuality: "EXCELLENT",
        businessCategory: "Automotivo",
        businessSubcategory: "Loja de carros",
      }),
      NOW,
    );
    expect(result.opportunityTypes).toHaveLength(0);
    expect(result.recommendedSolution).toContain("Sem evidências suficientes");
  });

  it("only emits CATALOG when there is audience or demand evidence", () => {
    const withoutEvidence = calculateLandingPageOpportunity(
      lead({ businessCategory: "Moda", businessSubcategory: "Loja de roupas" }),
      NOW,
    );
    expect(withoutEvidence.opportunityTypes.map((t) => t.type)).not.toContain("CATALOG");

    const withEvidence = calculateLandingPageOpportunity(
      lead({
        businessCategory: "Moda",
        businessSubcategory: "Loja de roupas",
        instagramUrl: "https://instagram.com/loja",
        instagramFollowers: 12_000,
        instagramLastPostAt: NOW.toISOString(),
        hasWhatsapp: true,
      }),
      NOW,
    );
    expect(withEvidence.opportunityTypes.map((t) => t.type)).toContain("CATALOG");
  });

  it("uses neutral demand when there is no public evidence", () => {
    const result = calculateLandingPageOpportunity(lead(), NOW);
    expect(result.demandScore).toBe(30);
  });

  it("records evidence for every observed signal", () => {
    const result = calculateLandingPageOpportunity(
      lead({ googleRating: 4.7, googleReviewCount: 210, hasWhatsapp: true, phone: "8599" }),
      NOW,
    );
    const codes = result.evidence.map((item) => item.code);
    expect(codes).toContain("GOOGLE_RATING");
    expect(codes).toContain("GOOGLE_REVIEWS");
    expect(codes).toContain("WHATSAPP");
    expect(codes).toContain("PHONE");
  });
});

describe("business examples", () => {
  it("gym: appointment + lead generation", () => {
    const result = calculateLandingPageOpportunity(
      lead({
        businessCategory: "Saúde e bem-estar",
        businessSubcategory: "Academia",
        businessModel: "APPOINTMENT",
        hasWhatsapp: true,
        phone: "+55 85 98888-8888",
        googleRating: 4.6,
        googleReviewCount: 320,
        instagramUrl: "https://instagram.com/academia",
        instagramFollowers: 8_000,
        instagramLastPostAt: NOW.toISOString(),
      }),
      NOW,
    );
    const types = result.opportunityTypes.map((t) => t.type);
    expect(types).toContain("APPOINTMENT");
    expect(types).toContain("LEAD_GENERATION");
    expect(result.opportunityScore).toBeGreaterThanOrEqual(60);
    expect(result.recommendedSolution).toContain("WhatsApp");
  });

  it("car dealer: catalog + lead generation", () => {
    const result = calculateLandingPageOpportunity(
      lead({
        businessCategory: "Automotivo",
        businessSubcategory: "Loja de carros",
        businessModel: "PRODUCT",
        hasWhatsapp: true,
        phone: "+55 85 97777-7777",
        googleRating: 4.4,
        googleReviewCount: 180,
      }),
      NOW,
    );
    const types = result.opportunityTypes.map((t) => t.type);
    expect(types).toContain("CATALOG");
    expect(types).toContain("LEAD_GENERATION");
  });

  it("custom furniture: quote opportunity", () => {
    const result = calculateLandingPageOpportunity(
      lead({
        businessCategory: "Casa e decoração",
        businessSubcategory: "Móveis planejados",
        businessModel: "QUOTE",
        hasWhatsapp: true,
        email: "contato@moveis.com",
        googleReviewCount: 45,
      }),
      NOW,
    );
    const types = result.opportunityTypes.map((t) => t.type);
    expect(types).toContain("QUOTE");
    expect(result.opportunityScore).toBeGreaterThanOrEqual(60);
  });

  it("active social profile without site yields digital presence opportunity", () => {
    const result = calculateLandingPageOpportunity(
      lead({
        instagramUrl: "https://instagram.com/negocio",
        instagramFollowers: 5_000,
        instagramLastPostAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
        hasWhatsapp: true,
      }),
      NOW,
    );
    expect(result.opportunityTypes.map((t) => t.type)).toContain("DIGITAL_PRESENCE");
  });
});

describe("followers must not dominate", () => {
  it("large but inactive audience does not beat an active smaller one", () => {
    const inactive = calculateLandingPageOpportunity(
      lead({
        instagramUrl: "https://instagram.com/big",
        instagramFollowers: 400_000,
        instagramLastPostAt: new Date(NOW.getTime() - 400 * 86_400_000).toISOString(),
      }),
      NOW,
    );
    expect(inactive.opportunityScore).toBeLessThan(100);
    expect(inactive.evidence.map((e) => e.code)).toContain("SOCIAL_INACTIVE");
  });

  it("progressive curve saturates", () => {
    expect(progressive(0, 100, 50)).toBe(0);
    expect(progressive(1_000_000, 100, 50)).toBeCloseTo(50);
    expect(progressive(50, 100, 50)).toBeLessThan(50);
  });
});

describe("classification and channels", () => {
  it("classifies bands", () => {
    expect(classifyOpportunity(95)).toBe("VERY_HIGH");
    expect(classifyOpportunity(65)).toBe("HIGH");
    expect(classifyOpportunity(45)).toBe("MEDIUM");
    expect(classifyOpportunity(10)).toBe("LOW");
  });

  it("flags the absence of any contact channel", () => {
    const result = calculateLandingPageOpportunity(lead(), NOW);
    expect(result.evidence.map((e) => e.code)).toContain("NO_CHANNEL");
    expect(result.channelScore).toBe(20);
  });

  it("matches category hints case-insensitively", () => {
    expect(matchCategoryHints(lead({ businessSubcategory: "ACADEMIA" }))).toHaveLength(1);
    expect(matchCategoryHints(lead())).toHaveLength(0);
  });
});

describe("persistence mapping and service", () => {
  it("maps one row per emitted type with shared evidence", () => {
    const result = calculateLandingPageOpportunity(
      lead({ hasWhatsapp: true, googleReviewCount: 120, businessModel: "QUOTE" }),
      NOW,
    );
    const rows = toOpportunityRows(result);
    expect(rows).toHaveLength(result.opportunityTypes.length);
    rows.forEach((row) => {
      expect(row.recommended_solution).toBe(result.recommendedSolution);
      expect(row.evidence).toBeTruthy();
    });
  });

  it("service loads the lead, analyzes and persists", async () => {
    const saved: LandingPageOpportunityResult[] = [];
    const store: OpportunityStore = {
      loadLead: async () =>
        ({
          hasWebsite: false,
          websiteUrl: null,
          websiteQuality: "NO_WEBSITE",
          phone: "+55 85 91111-1111",
          email: null,
          hasWhatsapp: true,
          googleRating: 4.9,
          googleReviewCount: 240,
          instagramUrl: null,
          instagramUsername: null,
          instagramFollowers: null,
          instagramPostCount: null,
          instagramLastPostAt: null,
          businessModel: "QUOTE",
          businessCategory: "Serviços",
          businessSubcategory: "Móveis planejados",
        }) as unknown as Lead,
      replaceOpportunities: async (_leadId, result) => {
        saved.push(result);
      },
    };

    const result = await new OpportunityService(store).analyzeLead("lead-1", NOW);
    expect(result.opportunityScore).toBeGreaterThan(0);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual(result);
  });
});
