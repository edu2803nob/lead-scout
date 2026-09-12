import { describe, expect, it, vi } from "vitest";

import { OFFER_PROFILE_TYPES } from "@/config/offer";
import { LLMService, type AIProvider } from "@/services/ai";
import {
  OfferService,
  buildOfferInstructions,
  buildOfferPayload,
  collectObservedProblems,
  offerRecommendationResponseSchema,
  toOfferColumns,
  toOfferResult,
  toStoredOffer,
} from "@/services/offer";
import type { OfferStore } from "@/services/offer";
import { calculateLandingPageOpportunity } from "@/services/opportunity/landing-page-opportunity";
import { toOpportunityLead } from "@/services/opportunity/opportunity-mapper";
import type { AICompletionResult } from "@/types/ai";
import type { StoredCommercialAnalysis } from "@/types/analysis";
import type { StoredDigitalAudit } from "@/types/audit";
import type { Lead } from "@/types/lead";
import type { OfferRecommendationResult, StoredOfferRecommendation } from "@/types/offer";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    companyName: "Academia Teste",
    businessCategory: "ESPORTE",
    businessSubcategory: "Academia",
    description: null,
    phone: "11999999999",
    email: null,
    address: "Rua Um, 10",
    city: "São Paulo",
    state: "SP",
    country: "BR",
    latitude: null,
    longitude: null,
    websiteUrl: null,
    hasWebsite: false,
    status: "NEW",
    source: "MANUAL",
    googlePlaceId: null,
    googleRating: 4.7,
    googleReviewCount: 25,
    websiteQuality: "NO_WEBSITE",
    instagramUrl: null,
    instagramUsername: null,
    instagramFollowers: null,
    instagramPostCount: null,
    instagramLastPostAt: null,
    hasWhatsapp: false,
    businessModel: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const audit: StoredDigitalAudit = {
  id: "33333333-3333-4333-8333-333333333333",
  leadId: "11111111-1111-4111-8111-111111111111",
  digitalPresenceScore: 30,
  conversionOpportunity: 80,
  landingPageOpportunity: 85,
  auditSummary: "Academia sem website e sem WhatsApp.",
  conversionProblems: [
    { area: "WEBSITE", severity: "HIGH", problem: "Nenhum website encontrado." },
    { area: "SCHEDULING", severity: "MEDIUM", problem: "Sem canal de aula experimental." },
  ],
  recommendedSections: [{ section: "HERO", justification: "Sem página de apresentação." }],
  evidence: [{ kind: "FACT", statement: "Não foi encontrado website." }],
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const modelResponse = {
  offerType: "geração de leads",
  secondaryOfferType: "agendamento",
  offerTitle: "Landing page de matrículas para a academia",
  mainObjective: "Captar contatos de interessados em matrícula.",
  recommendedSections: [
    { section: "hero", justification: "Não existe página que apresente a academia." },
    { section: "planos", justification: "Planos não estão públicos." },
    { section: "veiculos", justification: "Seção fora do segmento, deve ser descartada." },
  ],
  conversionStrategy: "Formulário curto no topo e WhatsApp em todas as seções.",
  primaryCTA: "Agendar aula experimental",
  secondaryCTA: "Falar no WhatsApp",
  valueProposition: "Uma página própria para transformar buscas no Google em matrículas.",
  linkedProblems: [
    { area: "site", severity: "alta", problem: "Nenhum website encontrado." },
    { area: "reputacao", severity: "baixa", problem: "Problema não observado." },
  ],
};

function completion(text: string): AICompletionResult {
  return {
    text,
    provider: "lovable",
    model: "google/gemini-2.5-flash",
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    finishReason: "stop",
  };
}

function llmWith(text: string): LLMService {
  const provider: AIProvider = {
    name: "lovable",
    model: "google/gemini-2.5-flash",
    complete: vi.fn(async () => completion(text)),
  };
  return new LLMService(provider);
}

function store(overrides: Partial<OfferStore> = {}): OfferStore {
  const saved: StoredOfferRecommendation[] = [];
  return {
    loadLead: async () => lead(),
    latestAudit: async () => audit,
    latestAnalysis: async () => null,
    latestOffer: async () => saved[0] ?? null,
    saveOffer: async (leadId, input) => {
      const stored: StoredOfferRecommendation = {
        id: "44444444-4444-4444-8444-444444444444",
        leadId,
        provider: input.provider,
        model: input.model,
        businessProfile: input.businessProfile,
        createdAt: "2026-01-03T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
        ...input.result,
      };
      saved.unshift(stored);
      return stored;
    },
    ...overrides,
  };
}

describe("offer prompt", () => {
  it("only allows the offer types of the detected segment", () => {
    const gym = buildOfferInstructions("GYM");
    expect(gym).toContain("LEAD_GENERATION");
    expect(gym).toContain("APPOINTMENT");
    expect(gym).not.toContain("CATALOG (");

    const furniture = buildOfferInstructions("FURNITURE");
    expect(furniture).toContain("QUOTE");
    expect(furniture).toContain("LEAD_GENERATION");
  });

  it("forbids selling a generic website", () => {
    expect(buildOfferInstructions("CLOTHING")).toContain("NÃO ofereça 'um site'");
  });

  it("sends the identified problems and no personal data", () => {
    const target = lead();
    const payload = buildOfferPayload({
      lead: target,
      opportunity: calculateLandingPageOpportunity(toOpportunityLead(target), new Date()),
      audit,
      analysis: null,
    });

    expect(payload["problemasIdentificados"]).toHaveLength(2);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("11999999999");
    expect(serialized).not.toContain(target.id);
  });
});

describe("offer schema", () => {
  it("normalises Portuguese labels and accents", () => {
    const parsed = offerRecommendationResponseSchema.parse(modelResponse);
    expect(parsed.offerType).toBe("LEAD_GENERATION");
    expect(parsed.secondaryOfferType).toBe("APPOINTMENT");
    expect(parsed.linkedProblems[0]?.area).toBe("WEBSITE");
    expect(parsed.linkedProblems[0]?.severity).toBe("HIGH");
  });

  it("rejects a response without a linked problem", () => {
    const result = offerRecommendationResponseSchema.safeParse({
      ...modelResponse,
      linkedProblems: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("offer mapper", () => {
  it("drops sections and problems outside the segment / observed data", () => {
    const parsed = offerRecommendationResponseSchema.parse(modelResponse);
    const result = toOfferResult(parsed, {
      profile: "GYM",
      observedProblems: audit.conversionProblems.map((item) => ({
        area: item.area,
        severity: item.severity,
        problem: item.problem,
      })),
    });

    expect(result.recommendedSections.map((item) => item.section)).toEqual(["HERO", "PLANS"]);
    expect(result.linkedProblems).toHaveLength(1);
    expect(result.linkedProblems[0]?.area).toBe("WEBSITE");
  });

  it("replaces an offer type that does not belong to the segment", () => {
    const parsed = offerRecommendationResponseSchema.parse({
      ...modelResponse,
      offerType: "CATALOG",
      secondaryOfferType: "CATALOG",
    });
    const result = toOfferResult(parsed, { profile: "GYM", observedProblems: [] });

    expect(OFFER_PROFILE_TYPES.GYM).toContain(result.offerType);
    expect(result.secondaryOfferType).toBeUndefined();
  });

  it("falls back to the observed problems when the model quotes unobserved areas", () => {
    const parsed = offerRecommendationResponseSchema.parse({
      ...modelResponse,
      linkedProblems: [{ area: "REPUTATION", severity: "LOW", problem: "Nada observado." }],
    });
    const result = toOfferResult(parsed, {
      profile: "GYM",
      observedProblems: [{ area: "WEBSITE", severity: "HIGH", problem: "Nenhum website." }],
    });

    expect(result.linkedProblems).toEqual([
      { area: "WEBSITE", severity: "HIGH", problem: "Nenhum website." },
    ]);
  });

  it("round-trips through the database columns", () => {
    const result: OfferRecommendationResult = {
      offerType: "QUOTE",
      offerTitle: "Página de orçamento de planejados",
      mainObjective: "Receber pedidos de orçamento qualificados.",
      recommendedSections: [{ section: "PORTFOLIO", justification: "Sem portfólio público." }],
      conversionStrategy: "Portfólio seguido de formulário de orçamento.",
      primaryCTA: "Solicitar orçamento",
      valueProposition: "Projetos apresentados com pedido de orçamento em uma página.",
      linkedProblems: [{ area: "QUOTE", severity: "HIGH", problem: "Sem canal de orçamento." }],
    };

    const columns = toOfferColumns({
      result,
      provider: "lovable",
      model: "google/gemini-2.5-flash",
      businessProfile: "FURNITURE",
    });

    const stored = toStoredOffer({
      ...columns,
      id: "55555555-5555-4555-8555-555555555555",
      lead_id: "11111111-1111-4111-8111-111111111111",
      user_id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-01-03T00:00:00.000Z",
      updated_at: "2026-01-03T00:00:00.000Z",
    } as never);

    expect(stored.offerType).toBe("QUOTE");
    expect(stored.secondaryOfferType).toBeUndefined();
    expect(stored.recommendedSections).toEqual(result.recommendedSections);
    expect(stored.linkedProblems).toEqual(result.linkedProblems);
  });
});

describe("offer service", () => {
  it("persists the recommendation from a valid model response", async () => {
    const service = new OfferService(store(), llmWith(JSON.stringify(modelResponse)));
    const result = await service.recommendOffer("11111111-1111-4111-8111-111111111111");

    expect(result.offerType).toBe("LEAD_GENERATION");
    expect(result.secondaryOfferType).toBe("APPOINTMENT");
    expect(result.linkedProblems.length).toBeGreaterThan(0);
    expect(result.provider).toBe("lovable");
  });

  it("refuses to recommend without an identified commercial problem", async () => {
    const service = new OfferService(
      store({ latestAudit: async () => null, latestAnalysis: async () => null }),
      llmWith(JSON.stringify(modelResponse)),
    );

    await expect(service.recommendOffer("11111111-1111-4111-8111-111111111111")).rejects.toThrow(
      /problema comercial/i,
    );
  });

  it("uses the analysis pain points when there is no audit", () => {
    const analysis = {
      painPoints: ["Não há canal de captação de contatos."],
    } as unknown as StoredCommercialAnalysis;

    expect(collectObservedProblems(null, analysis)).toEqual([
      {
        area: "DIGITAL_PRESENCE",
        severity: "MEDIUM",
        problem: "Não há canal de captação de contatos.",
      },
    ]);
  });

  it("does not call the LLM when only reading the stored offer", async () => {
    const provider: AIProvider = {
      name: "lovable",
      model: "google/gemini-2.5-flash",
      complete: vi.fn(async () => completion("{}")),
    };
    const service = new OfferService(store(), new LLMService(provider));

    await service.getLatest("11111111-1111-4111-8111-111111111111");
    expect(provider.complete).not.toHaveBeenCalled();
  });
});
