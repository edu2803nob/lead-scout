import { describe, expect, it, vi } from "vitest";

import { detectBusinessProfile, BUSINESS_PROFILE_CONFIG } from "@/config/commercial-analysis";
import { AIInvalidResponseError, LLMService, type AIProvider } from "@/services/ai";
import {
  AnalysisService,
  buildAnalysisInstructions,
  buildAnalysisPayload,
  commercialAnalysisSchema,
  profileForLead,
  toAnalysisColumns,
  toStoredAnalysis,
} from "@/services/analysis";
import type { AnalysisStore } from "@/services/analysis";
import type { AICompletionResult } from "@/types/ai";
import type { CommercialAnalysisResult, StoredCommercialAnalysis } from "@/types/analysis";
import type { Lead } from "@/types/lead";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    companyName: "Empresa Teste",
    businessCategory: null,
    businessSubcategory: null,
    description: null,
    phone: "11999999999",
    email: null,
    address: null,
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
    googleRating: null,
    googleReviewCount: null,
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

const validResponse: CommercialAnalysisResult = {
  purchasePotential: 82,
  confidence: 0.6,
  summary: "Academia sem website, com presença ativa no Instagram e boa reputação no Google.",
  painPoints: ["Não possui website para apresentar planos"],
  opportunities: ["Landing page de matrícula com agendamento de aula experimental"],
  recommendedOffer: "Landing page de matrícula com formulário de aula experimental",
  recommendedApproach: "Contato por WhatsApp citando os planos divulgados no Instagram",
  reasoning: ["Sem website, a captação depende de canais sociais"],
  evidence: [
    { kind: "FACT", statement: "Não foi encontrado website.", source: "possuiWebsite" },
    { kind: "INFERENCE", statement: "A empresa pode depender do Instagram para direcionar clientes." },
    { kind: "UNKNOWN", statement: "Não foi possível determinar a taxa de conversão." },
  ],
};

function completion(payload: unknown, overrides: Partial<AICompletionResult> = {}) {
  return {
    text: typeof payload === "string" ? payload : JSON.stringify(payload),
    finishReason: "stop",
    model: "test-model",
    provider: "test",
    usage: { inputTokens: 200, outputTokens: 120, totalTokens: 320 },
    ...overrides,
  } satisfies AICompletionResult;
}

function fakeProvider(responses: Array<AICompletionResult | Error>): AIProvider & {
  systems: string[];
  prompts: string[];
} {
  let index = 0;
  const systems: string[] = [];
  const prompts: string[] = [];
  return {
    name: "test",
    model: "test-model",
    systems,
    prompts,
    async complete(request) {
      systems.push(request.system ?? "");
      prompts.push(request.prompt);
      const next = responses[Math.min(index, responses.length - 1)];
      index += 1;
      if (next instanceof Error) throw next;
      return next!;
    },
  };
}

function fakeStore(target: Lead) {
  const saved: Array<{ result: CommercialAnalysisResult; businessProfile: string }> = [];
  const store: AnalysisStore = {
    loadLead: async () => target,
    saveAnalysis: async (leadId, input) => {
      saved.push({ result: input.result, businessProfile: input.businessProfile });
      return {
        ...input.result,
        id: "33333333-3333-4333-8333-333333333333",
        leadId,
        provider: input.provider,
        model: input.model,
        businessProfile: input.businessProfile,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } satisfies StoredCommercialAnalysis;
    },
    latestAnalysis: async () => null,
  };
  return { store, saved };
}

function service(target: Lead, responses: Array<AICompletionResult | Error>) {
  const provider = fakeProvider(responses);
  const { store, saved } = fakeStore(target);
  const llm = new LLMService(provider, { sleep: async () => undefined, maxAttempts: 2 });
  return { service: new AnalysisService(store, llm), provider, saved };
}

describe("business profile detection", () => {
  it("recognises gyms, car dealers, clothing and furniture", () => {
    expect(detectBusinessProfile({ businessSubcategory: "Academia de musculação" })).toBe("GYM");
    expect(detectBusinessProfile({ businessCategory: "Revenda de veículos" })).toBe("CAR_DEALER");
    expect(detectBusinessProfile({ businessSubcategory: "Loja de roupas femininas" })).toBe(
      "CLOTHING",
    );
    expect(detectBusinessProfile({ businessSubcategory: "Móveis planejados" })).toBe("FURNITURE");
  });

  it("falls back to a generic profile without category data", () => {
    expect(detectBusinessProfile({})).toBe("GENERIC");
    expect(profileForLead(lead())).toBe("GENERIC");
  });

  it("uses segment-specific levers in the instructions", () => {
    const gym = buildAnalysisInstructions("GYM");
    const cars = buildAnalysisInstructions("CAR_DEALER");
    expect(gym).toContain("matrícula");
    expect(gym).toContain("agendamento de aula experimental");
    expect(cars).toContain("financiamento");
    expect(cars).not.toContain("aula experimental");
    expect(gym).not.toEqual(cars);
    for (const key of ["CLOTHING", "FURNITURE"] as const) {
      const text = buildAnalysisInstructions(key);
      expect(text).toContain(BUSINESS_PROFILE_CONFIG[key].focus[0]!);
    }
  });
});

describe("analysis payload", () => {
  const target = lead({
    businessSubcategory: "Academia",
    email: "contato@empresa.com",
    instagramFollowers: 4200,
    googleRating: 4.7,
    googleReviewCount: 320,
    hasWhatsapp: true,
  });

  it("sends only the fields needed for the commercial analysis", () => {
    const payload = buildAnalysisPayload({
      lead: target,
      score: {
        totalScore: 70,
        classification: "HIGH",
        digitalPresenceScore: 40,
        audienceScore: 60,
        reputationScore: 90,
        commercialPotentialScore: 65,
        conversionOpportunityScore: 100,
        factors: [],
      },
      opportunity: {
        opportunityScore: 88,
        level: "VERY_HIGH",
        gapScore: 100,
        demandScore: 80,
        fitScore: 70,
        channelScore: 75,
        opportunityTypes: [],
        recommendedSolution: "Landing page de conversão",
        evidence: [
          { code: "NO_SITE", source: "WEBSITE", label: "Sem website", detail: "Nenhum site encontrado" },
        ],
      },
    });

    expect(payload["empresa"]).toBe("Empresa Teste");
    expect(payload["seguidoresInstagram"]).toBe(4200);
    expect(payload["evidencias"]).toEqual(["Sem website: Nenhum site encontrado"]);
    expect(Object.keys(payload)).not.toContain("email");
    expect(Object.keys(payload)).not.toContain("phone");
    expect(Object.keys(payload)).not.toContain("id");
    expect(Object.keys(payload)).not.toContain("userId");
  });
});

describe("commercial analysis schema", () => {
  it("accepts a well-formed response", () => {
    expect(commercialAnalysisSchema.parse(validResponse).purchasePotential).toBe(82);
  });

  it("rejects unknown evidence kinds", () => {
    expect(
      commercialAnalysisSchema.safeParse({
        ...validResponse,
        evidence: [{ kind: "GUESS", statement: "algo" }],
      }).success,
    ).toBe(false);
  });

  it("normalises numeric fields written as text or out of range", () => {
    expect(
      commercialAnalysisSchema.parse({ ...validResponse, purchasePotential: 140 })
        .purchasePotential,
    ).toBe(100);
    expect(commercialAnalysisSchema.parse({ ...validResponse, confidence: 80 }).confidence).toBe(
      0.8,
    );
    expect(
      commercialAnalysisSchema.parse({ ...validResponse, purchasePotential: "Alto" })
        .purchasePotential,
    ).toBe(75);
    expect(
      commercialAnalysisSchema.parse({ ...validResponse, evidence: [{ kind: "fato", statement: "sem site" }] })
        .evidence[0]!.kind,
    ).toBe("FACT");
  });

  it("rejects incomplete responses (missing lists)", () => {
    const { painPoints: _painPoints, ...incomplete } = validResponse;
    expect(commercialAnalysisSchema.safeParse(incomplete).success).toBe(false);
    expect(
      commercialAnalysisSchema.safeParse({ ...validResponse, evidence: [] }).success,
    ).toBe(false);
  });
});

describe("AnalysisService", () => {
  it("analyses a gym and persists the result with its profile", async () => {
    const target = lead({ businessSubcategory: "Academia", instagramUsername: "academia" });
    const { service: svc, provider, saved } = service(target, [completion(validResponse)]);

    const stored = await svc.analyzeLead(target.id, { now: new Date("2026-01-10T00:00:00Z") });

    expect(stored.purchasePotential).toBe(82);
    expect(stored.businessProfile).toBe("GYM");
    expect(saved).toHaveLength(1);
    expect(provider.systems[0]).toContain("matrícula");
    // Lead Score and Opportunity Score are provided as context, not asked from the LLM.
    expect(provider.prompts[0]).toContain("leadScore");
    expect(provider.prompts[0]).toContain("opportunityScore");
  });

  it("changes the analysis focus per segment", async () => {
    const cars = lead({ businessSubcategory: "Loja de carros seminovos" });
    const furniture = lead({ businessSubcategory: "Móveis planejados" });

    const first = service(cars, [completion(validResponse)]);
    await first.service.analyzeLead(cars.id);
    const second = service(furniture, [completion(validResponse)]);
    await second.service.analyzeLead(furniture.id);

    expect(first.provider.systems[0]).toContain("estoque");
    expect(second.provider.systems[0]).toContain("orçamento");
    expect(first.saved[0]!.businessProfile).toBe("CAR_DEALER");
    expect(second.saved[0]!.businessProfile).toBe("FURNITURE");
  });

  it("rejects invalid JSON and never persists it", async () => {
    const target = lead();
    const { service: svc, saved } = service(target, [completion("isto não é json")]);
    await expect(svc.analyzeLead(target.id)).rejects.toBeInstanceOf(AIInvalidResponseError);
    expect(saved).toHaveLength(0);
  });

  it("rejects a response that breaks the schema", async () => {
    const target = lead();
    const { service: svc, saved } = service(target, [
      completion({ ...validResponse, evidence: [{ kind: "MAYBE", statement: "x" }] }),
    ]);
    await expect(svc.analyzeLead(target.id)).rejects.toBeInstanceOf(AIInvalidResponseError);
    expect(saved).toHaveLength(0);
  });

  it("propagates provider failures without saving", async () => {
    const target = lead();
    const { service: svc, saved } = service(target, [new Error("boom")]);
    await expect(svc.analyzeLead(target.id)).rejects.toThrow();
    expect(saved).toHaveLength(0);
  });

  it("does not call the LLM when only reading the stored analysis", async () => {
    const target = lead();
    const provider = fakeProvider([completion(validResponse)]);
    const spy = vi.spyOn(provider, "complete");
    const { store } = fakeStore(target);
    const svc = new AnalysisService(store, new LLMService(provider));

    await svc.getLatest(target.id);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("analysis persistence mapping", () => {
  it("maps result to columns without persisting prompts", () => {
    const columns = toAnalysisColumns({
      result: validResponse,
      provider: "test",
      model: "test-model",
      businessProfile: "GYM",
    }) as Record<string, unknown>;

    expect(columns["purchase_potential"]).toBe(82);
    expect(columns["confidence"]).toBe(0.6);
    expect(columns["reasoning_items"]).toEqual(validResponse.reasoning);
    expect(columns["evidence"]).toEqual(validResponse.evidence);
    expect(columns["business_profile"]).toBe("GYM");
    expect(Object.keys(columns)).not.toContain("prompt");
    expect(Object.keys(columns)).not.toContain("instructions");
  });

  it("reads a row back into the domain shape", () => {
    const stored = toStoredAnalysis({
      id: "33333333-3333-4333-8333-333333333333",
      lead_id: "11111111-1111-4111-8111-111111111111",
      user_id: "22222222-2222-4222-8222-222222222222",
      provider: "test",
      model: "test-model",
      summary: validResponse.summary,
      purchase_potential: 82,
      confidence: 0.6,
      pain_points: validResponse.painPoints,
      opportunities: validResponse.opportunities,
      reasoning: validResponse.reasoning.join("\n"),
      recommended_offer: validResponse.recommendedOffer,
      recommended_approach: validResponse.recommendedApproach,
      suggested_message: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      reasoning_items: validResponse.reasoning,
      evidence: [...validResponse.evidence, { kind: "BOGUS", statement: "ignorar" }],
      business_profile: "GYM",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(stored.reasoning).toEqual(validResponse.reasoning);
    // Unknown kinds coming from old rows are dropped instead of breaking the UI.
    expect(stored.evidence).toHaveLength(3);
    expect(stored.evidence.map((item) => item.kind)).toEqual(["FACT", "INFERENCE", "UNKNOWN"]);
  });
});
