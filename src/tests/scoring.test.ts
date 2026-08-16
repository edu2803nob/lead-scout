import { describe, expect, it } from "vitest";

import { SCORE_WEIGHTS } from "@/config/scoring";
import {
  calculateLeadScore,
  classifyScore,
  progressiveCurve,
  resolveSocialActivity,
} from "@/services/scoring/lead-score";
import {
  CLASSIFICATION_TO_DB,
  toScorableLead,
  toScoreColumns,
} from "@/services/scoring/score-mapper";
import { ScoringService } from "@/services/scoring/scoring-service";
import type { Lead } from "@/types/lead";
import type { LeadScoreResult, ScorableLead } from "@/types/scoring";

const NOW = new Date("2026-08-16T12:00:00Z");

const base: ScorableLead = {
  hasWebsite: false,
  websiteUrl: null,
  websiteQuality: "NO_WEBSITE",
  phone: null,
  email: null,
  hasWhatsapp: false,
  googlePlaceId: null,
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
};

const lead = (overrides: Partial<ScorableLead> = {}): ScorableLead => ({ ...base, ...overrides });

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe("configuração", () => {
  it("os pesos das dimensões somam 1", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 6);
  });
});

describe("curva progressiva", () => {
  it("cresce mais no início e satura", () => {
    const a = progressiveCurve(500, 50_000, 70);
    const b = progressiveCurve(5_000, 50_000, 70);
    const c = progressiveCurve(50_000, 50_000, 70);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(c).toBeCloseTo(70, 5);
    expect(progressiveCurve(1_000_000, 50_000, 70)).toBeLessThanOrEqual(70);
    expect(progressiveCurve(0, 50_000, 70)).toBe(0);
    expect(progressiveCurve(-10, 50_000, 70)).toBe(0);
  });
});

describe("classificação", () => {
  it("respeita as faixas 80/60/40", () => {
    expect(classifyScore(100)).toBe("VERY_HIGH");
    expect(classifyScore(80)).toBe("VERY_HIGH");
    expect(classifyScore(79)).toBe("HIGH");
    expect(classifyScore(60)).toBe("HIGH");
    expect(classifyScore(59)).toBe("MEDIUM");
    expect(classifyScore(40)).toBe("MEDIUM");
    expect(classifyScore(39)).toBe("LOW");
    expect(classifyScore(0)).toBe("LOW");
  });
});

describe("atividade social", () => {
  it("deriva do último post e nunca inventa", () => {
    expect(resolveSocialActivity(lead({ instagramLastPostAt: daysAgo(2) }), NOW)).toBe("VERY_ACTIVE");
    expect(resolveSocialActivity(lead({ instagramLastPostAt: daysAgo(20) }), NOW)).toBe("ACTIVE");
    expect(resolveSocialActivity(lead({ instagramLastPostAt: daysAgo(60) }), NOW)).toBe("MODERATE");
    expect(resolveSocialActivity(lead({ instagramLastPostAt: daysAgo(400) }), NOW)).toBe("INACTIVE");
    expect(resolveSocialActivity(lead(), NOW)).toBe("UNKNOWN");
    expect(resolveSocialActivity(lead({ instagramLastPostAt: "não-é-data" }), NOW)).toBe("UNKNOWN");
  });
});

describe("regras de negócio do score", () => {
  it("sem website gera oportunidade máxima", () => {
    const result = calculateLeadScore(lead({ phone: "+5585999990000" }), NOW);
    expect(result.conversionOpportunityScore).toBe(100);
    expect(result.factors.some((f) => f.code === "NO_WEBSITE")).toBe(true);
  });

  it("website fraco gera oportunidade intermediária", () => {
    const weak = calculateLeadScore(
      lead({ hasWebsite: true, websiteQuality: "WEAK", phone: "1" }),
      NOW,
    );
    const excellent = calculateLeadScore(
      lead({ hasWebsite: true, websiteQuality: "EXCELLENT", phone: "1" }),
      NOW,
    );
    expect(weak.conversionOpportunityScore).toBeGreaterThan(excellent.conversionOpportunityScore);
    expect(weak.conversionOpportunityScore).toBeLessThan(100);
    expect(weak.conversionOpportunityScore).toBeGreaterThanOrEqual(70);
  });

  it("website excelente aumenta presença digital e reduz oportunidade", () => {
    const excellent = calculateLeadScore(
      lead({ hasWebsite: true, websiteQuality: "EXCELLENT" }),
      NOW,
    );
    const none = calculateLeadScore(lead(), NOW);
    expect(excellent.digitalPresenceScore).toBeGreaterThan(none.digitalPresenceScore);
    expect(excellent.conversionOpportunityScore).toBeLessThan(none.conversionOpportunityScore);
  });

  it("instagram ativo pontua positivamente", () => {
    const active = calculateLeadScore(
      lead({ instagramUsername: "loja", instagramLastPostAt: daysAgo(3) }),
      NOW,
    );
    const inactive = calculateLeadScore(
      lead({ instagramUsername: "loja", instagramLastPostAt: daysAgo(400) }),
      NOW,
    );
    expect(active.totalScore).toBeGreaterThan(inactive.totalScore);
    expect(active.factors.some((f) => f.code === "SOCIAL_ACTIVE")).toBe(true);
  });

  it("seguidores têm peso progressivo", () => {
    const small = calculateLeadScore(
      lead({ instagramUsername: "a", instagramFollowers: 500, instagramLastPostAt: daysAgo(2) }),
      NOW,
    );
    const big = calculateLeadScore(
      lead({ instagramUsername: "a", instagramFollowers: 80_000, instagramLastPostAt: daysAgo(2) }),
      NOW,
    );
    expect(big.audienceScore).toBeGreaterThan(small.audienceScore);
    // a diferença de audiência não pode ser proporcional à diferença de seguidores
    expect(big.audienceScore - small.audienceScore).toBeLessThan(60);
  });

  it("avaliação e volume de avaliações pontuam positivamente", () => {
    const noReviews = calculateLeadScore(lead({ googlePlaceId: "p" }), NOW);
    const good = calculateLeadScore(
      lead({ googlePlaceId: "p", googleRating: 4.8, googleReviewCount: 320 }),
      NOW,
    );
    const bad = calculateLeadScore(
      lead({ googlePlaceId: "p", googleRating: 2.2, googleReviewCount: 5 }),
      NOW,
    );
    expect(good.reputationScore).toBeGreaterThan(noReviews.reputationScore);
    expect(good.reputationScore).toBeGreaterThan(bad.reputationScore);
    expect(bad.reputationScore).toBeLessThan(noReviews.reputationScore + 10);
  });

  it("whatsapp pontua positivamente", () => {
    const withWhats = calculateLeadScore(lead({ phone: "1", hasWhatsapp: true }), NOW);
    const without = calculateLeadScore(lead({ phone: "1" }), NOW);
    expect(withWhats.totalScore).toBeGreaterThan(without.totalScore);
    expect(withWhats.factors.some((f) => f.code === "WHATSAPP")).toBe(true);
  });

  it("modelo de negócio considera potencial de landing page", () => {
    const leadGen = calculateLeadScore(lead({ businessModel: "LEAD_GENERATION" }), NOW);
    const localSale = calculateLeadScore(lead({ businessModel: "LOCAL_SALE" }), NOW);
    const unknown = calculateLeadScore(lead({ businessModel: null }), NOW);
    expect(leadGen.commercialPotentialScore).toBeGreaterThan(localSale.commercialPotentialScore);
    expect(unknown.factors.some((f) => f.code === "BUSINESS_MODEL_UNKNOWN")).toBe(true);
  });

  it("muitos seguidores com baixa atividade não vira lead excelente", () => {
    const result = calculateLeadScore(
      lead({
        hasWebsite: true,
        websiteQuality: "EXCELLENT",
        instagramUsername: "grande",
        instagramFollowers: 900_000,
        instagramPostCount: 5,
        instagramLastPostAt: daysAgo(500),
        googlePlaceId: "p",
        googleRating: 4.9,
        googleReviewCount: 900,
        phone: "1",
        email: "a@b.com",
        hasWhatsapp: true,
        businessModel: "LEAD_GENERATION",
        businessCategory: "MODA",
        businessSubcategory: "loja-de-roupas",
      }),
      NOW,
    );
    expect(result.audienceScore).toBeLessThanOrEqual(55);
    expect(result.classification).not.toBe("VERY_HIGH");
  });

  it("seguidores isolados não dominam o score", () => {
    const onlyFollowers = calculateLeadScore(
      lead({ instagramUsername: "a", instagramFollowers: 1_000_000, instagramLastPostAt: daysAgo(1) }),
      NOW,
    );
    expect(onlyFollowers.audienceScore).toBeGreaterThan(60);
    expect(onlyFollowers.totalScore).toBeLessThan(80);
  });
});

describe("casos extremos", () => {
  it("lead completamente vazio produz score baixo e válido", () => {
    const result = calculateLeadScore(lead(), NOW);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.classification).toMatch(/LOW|MEDIUM/);
  });

  it("valores absurdos são saneados e o máximo é 100", () => {
    const result = calculateLeadScore(
      lead({
        instagramFollowers: Number.MAX_SAFE_INTEGER,
        instagramPostCount: 10_000_000,
        googleRating: 99,
        googleReviewCount: 10_000_000,
        instagramUsername: "x",
        instagramLastPostAt: daysAgo(0),
        phone: "1",
        email: "a@b.com",
        hasWhatsapp: true,
        businessModel: "LEAD_GENERATION",
        businessCategory: "SERVICOS",
        businessSubcategory: "consultoria",
      }),
      NOW,
    );
    for (const value of [
      result.totalScore,
      result.digitalPresenceScore,
      result.audienceScore,
      result.reputationScore,
      result.commercialPotentialScore,
      result.conversionOpportunityScore,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("data de post no futuro não gera atividade inventada", () => {
    const result = calculateLeadScore(
      lead({ instagramUsername: "a", instagramLastPostAt: "2030-01-01T00:00:00Z" }),
      NOW,
    );
    expect(result.factors.some((f) => f.code === "SOCIAL_ACTIVE")).toBe(false);
  });

  it("é determinístico e não altera o lead recebido", () => {
    const input = lead({ instagramFollowers: 1_200, googleRating: 4.1, phone: "1" });
    const snapshot = JSON.stringify(input);
    const first = calculateLeadScore(input, NOW);
    const second = calculateLeadScore(input, NOW);
    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("gera explicação para todos os fatores", () => {
    const result = calculateLeadScore(lead({ phone: "1", googlePlaceId: "p" }), NOW);
    expect(result.factors.length).toBeGreaterThan(0);
    for (const factor of result.factors) {
      expect(factor.explanation.length).toBeGreaterThan(10);
      expect(["POSITIVE", "NEGATIVE", "NEUTRAL"]).toContain(factor.impact);
    }
  });
});

describe("integração com persistência", () => {
  const dbLead = {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    companyName: "Oficina Beta",
    businessCategory: "AUTOMOTIVO",
    businessSubcategory: "oficina-mecanica",
    description: null,
    phone: "+5585999990000",
    email: null,
    address: null,
    city: "Fortaleza",
    state: "CE",
    country: "BR",
    latitude: null,
    longitude: null,
    websiteUrl: null,
    hasWebsite: false,
    status: "NEW",
    source: "GOOGLE_PLACES",
    googlePlaceId: "place-1",
    googleRating: 4.5,
    googleReviewCount: 120,
    websiteQuality: "NO_WEBSITE",
    instagramUrl: null,
    instagramUsername: null,
    instagramFollowers: null,
    instagramPostCount: null,
    instagramLastPostAt: null,
    hasWhatsapp: true,
    businessModel: "SERVICE",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  } as Lead;

  it("calcula e persiste as dimensões sem alterar o lead", async () => {
    const saved: LeadScoreResult[] = [];
    const service = new ScoringService({
      loadLead: async () => dbLead,
      saveScore: async (_id, result) => {
        saved.push(result);
      },
    });

    const snapshot = JSON.stringify(dbLead);
    const result = await service.scoreLead(dbLead.id, NOW);

    expect(JSON.stringify(dbLead)).toBe(snapshot);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.totalScore).toBe(result.totalScore);
    expect(result.totalScore).toBe(calculateLeadScore(toScorableLead(dbLead), NOW).totalScore);
  });

  it("mapeia o resultado para as colunas do banco", () => {
    const result = calculateLeadScore(toScorableLead(dbLead), NOW);
    const columns = toScoreColumns(result);
    expect(columns.total_score).toBe(result.totalScore);
    expect(columns.classification).toBe(CLASSIFICATION_TO_DB[result.classification]);
    expect(columns.conversion_opportunity_score).toBe(result.conversionOpportunityScore);
  });
});
