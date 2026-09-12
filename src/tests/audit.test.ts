import { describe, expect, it, vi } from "vitest";

import { AUDIT_PROFILE_SECTIONS } from "@/config/digital-audit";
import { LLMService, type AIProvider } from "@/services/ai";
import {
  AuditService,
  buildAuditInstructions,
  buildAuditPayload,
  digitalAuditResponseSchema,
  toAuditColumns,
  toAuditResult,
  toStoredAudit,
} from "@/services/audit";
import type { AuditStore } from "@/services/audit";
import { calculateLandingPageOpportunity } from "@/services/opportunity/landing-page-opportunity";
import { toOpportunityLead } from "@/services/opportunity/opportunity-mapper";
import { calculateLeadScore } from "@/services/scoring/lead-score";
import { toScorableLead } from "@/services/scoring/score-mapper";
import type { AICompletionResult } from "@/types/ai";
import type { DigitalAuditResult, StoredDigitalAudit } from "@/types/audit";
import type { Lead } from "@/types/lead";

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

const modelResponse = {
  auditSummary:
    "Academia sem website e sem WhatsApp, com boa reputação no Google e sem canal de conversão.",
  conversionProblems: [
    { area: "WEBSITE", severity: "HIGH", problem: "Nenhum website encontrado.", source: "website" },
    { area: "CONTACT", severity: "MEDIUM", problem: "Sem WhatsApp cadastrado." },
  ],
  recommendedSections: [
    { section: "HERO", justification: "Não há página que apresente a proposta da academia." },
    { section: "PLANS", justification: "Planos e mensalidades não estão públicos." },
    { section: "WHATSAPP", justification: "Não há canal rápido de contato observado." },
    { section: "VEHICLES", justification: "Seção fora do segmento, deve ser descartada." },
  ],
  evidence: [
    { kind: "FACT", statement: "Não foi encontrado website.", source: "website" },
    { kind: "INFERENCE", statement: "A empresa pode depender do Google para ser encontrada." },
    { kind: "UNKNOWN", statement: "Não foi possível determinar a taxa de conversão." },
  ],
};

function completion(text: string): AICompletionResult {
  return {
    text,
    usage: { inputTokens: 300, outputTokens: 300, totalTokens: 600 },
    model: "google/gemini-2.5-flash",
    provider: "lovable",
    finishReason: "stop",
  };
}

function providerWith(text: string): AIProvider {
  return {
    name: "lovable",
    model: "google/gemini-2.5-flash",
    complete: vi.fn(async () => completion(text)),
  };
}

function store(saved: StoredDigitalAudit | null = null) {
  const saveAudit = vi.fn(
    async (leadId: string, result: DigitalAuditResult): Promise<StoredDigitalAudit> => ({
      id: "33333333-3333-4333-8333-333333333333",
      leadId,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...result,
    }),
  );
  return {
    loadLead: vi.fn(async () => lead()),
    saveAudit,
    latestAudit: vi.fn(async () => saved),
  } satisfies AuditStore;
}

function service(text: string, auditStore = store()) {
  const llm = new LLMService(providerWith(text), { maxAttempts: 1, sleep: async () => {} });
  return { service: new AuditService(auditStore, llm), store: auditStore };
}

describe("digital audit prompt", () => {
  it("only offers the sections of the detected segment", () => {
    const instructions = buildAuditInstructions("GYM");
    expect(instructions).toContain("PLANS");
    expect(instructions).toContain("MODALITIES");
    expect(instructions).not.toContain("VEHICLES");
    expect(instructions).toContain("NÃO recomende todas as seções");
  });

  it("audits every requested dimension", () => {
    const instructions = buildAuditInstructions("SERVICES");
    for (const topic of ["website", "Instagram", "Google", "CTA", "catálogo", "agendamento", "orçamento"]) {
      expect(instructions).toContain(topic);
    }
  });

  it("sends only the minimum data (no ids, e-mail or phone number)", () => {
    const target = lead({ email: "contato@empresa.com" });
    const score = calculateLeadScore(toScorableLead(target));
    const opportunity = calculateLandingPageOpportunity(toOpportunityLead(target));
    const payload = buildAuditPayload({ lead: target, score, opportunity });
    const serialized = JSON.stringify(payload);

    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("userId");
    expect(serialized).not.toContain("contato@empresa.com");
    expect(serialized).not.toContain("11999999999");
    expect(payload["possuiEmail"]).toBe(true);
    expect(payload["possuiTelefone"]).toBe(true);
  });
});

describe("digital audit schema", () => {
  it("accepts Portuguese aliases and lowercase values", () => {
    const parsed = digitalAuditResponseSchema.parse({
      auditSummary: modelResponse.auditSummary,
      conversionProblems: [{ area: "site", severity: "alta", problem: "Sem website." }],
      recommendedSections: [{ section: "planos", justification: "Planos não estão públicos." }],
      evidence: [{ kind: "fato", statement: "Não foi encontrado website." }],
    });

    expect(parsed.conversionProblems[0]?.area).toBe("WEBSITE");
    expect(parsed.conversionProblems[0]?.severity).toBe("HIGH");
    expect(parsed.recommendedSections[0]?.section).toBe("PLANS");
    expect(parsed.evidence[0]?.kind).toBe("FACT");
  });

  it("rejects unknown sections and sections without justification", () => {
    expect(() =>
      digitalAuditResponseSchema.parse({
        ...modelResponse,
        recommendedSections: [{ section: "SEÇÃO_INVENTADA", justification: "sem base" }],
      }),
    ).toThrow();

    expect(() =>
      digitalAuditResponseSchema.parse({
        ...modelResponse,
        recommendedSections: [{ section: "HERO", justification: "" }],
      }),
    ).toThrow();
  });

  it("rejects a response without evidence", () => {
    expect(() =>
      digitalAuditResponseSchema.parse({ ...modelResponse, evidence: [] }),
    ).toThrow();
  });
});

describe("digital audit mapper", () => {
  it("keeps deterministic scores and drops sections outside the segment", () => {
    const parsed = digitalAuditResponseSchema.parse(modelResponse);
    const result = toAuditResult(
      parsed,
      { digitalPresenceScore: 20, conversionOpportunity: 90, landingPageOpportunity: 87 },
      "GYM",
    );

    expect(result.digitalPresenceScore).toBe(20);
    expect(result.conversionOpportunity).toBe(90);
    expect(result.landingPageOpportunity).toBe(87);
    const sections = result.recommendedSections.map((item) => item.section);
    expect(sections).toEqual(["HERO", "PLANS", "WHATSAPP"]);
    for (const section of sections) {
      expect(AUDIT_PROFILE_SECTIONS.GYM).toContain(section);
    }
    expect(result.recommendedSections.length).toBeLessThan(AUDIT_PROFILE_SECTIONS.GYM.length);
  });

  it("round-trips through database columns", () => {
    const parsed = digitalAuditResponseSchema.parse(modelResponse);
    const result = toAuditResult(
      parsed,
      { digitalPresenceScore: 20, conversionOpportunity: 90, landingPageOpportunity: 87 },
      "GYM",
    );
    const columns = toAuditColumns(result);
    const stored = toStoredAudit({
      ...columns,
      id: "33333333-3333-4333-8333-333333333333",
      lead_id: "11111111-1111-4111-8111-111111111111",
      user_id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } as never);

    expect(stored.auditSummary).toBe(result.auditSummary);
    expect(stored.conversionProblems).toHaveLength(2);
    expect(stored.recommendedSections.map((item) => item.section)).toEqual([
      "HERO",
      "PLANS",
      "WHATSAPP",
    ]);
    expect(stored.evidence.map((item) => item.kind)).toEqual(["FACT", "INFERENCE", "UNKNOWN"]);
  });
});

describe("AuditService", () => {
  it("persists the audit with deterministic scores", async () => {
    const { service: auditService, store: auditStore } = service(JSON.stringify(modelResponse));
    const target = lead();
    const score = calculateLeadScore(toScorableLead(target));
    const opportunity = calculateLandingPageOpportunity(toOpportunityLead(target));

    const stored = await auditService.auditLead(target.id, { subject: target.userId });

    expect(auditStore.saveAudit).toHaveBeenCalledOnce();
    expect(stored.digitalPresenceScore).toBe(score.digitalPresenceScore);
    expect(stored.conversionOpportunity).toBe(score.conversionOpportunityScore);
    expect(stored.landingPageOpportunity).toBe(opportunity.opportunityScore);
    expect(stored.recommendedSections.every((item) =>
      AUDIT_PROFILE_SECTIONS.GYM.includes(item.section),
    )).toBe(true);
  });

  it("does not persist anything when the response is invalid", async () => {
    const { service: auditService, store: auditStore } = service("não é json");
    await expect(auditService.auditLead(lead().id)).rejects.toThrow();
    expect(auditStore.saveAudit).not.toHaveBeenCalled();
  });

  it("never calls the LLM when only reading the stored audit", async () => {
    const auditStore = store(null);
    const provider = providerWith(JSON.stringify(modelResponse));
    const auditService = new AuditService(auditStore, new LLMService(provider));

    await auditService.getLatest(lead().id);

    expect(provider.complete).not.toHaveBeenCalled();
  });
});
