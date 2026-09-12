import { describe, expect, it, vi } from "vitest";

import { OUTREACH_STYLES } from "@/config/outreach";
import { LLMService, type AIProvider } from "@/services/ai";
import {
  OutreachService,
  buildOutreachInstructions,
  buildOutreachPayload,
  outreachResponseSchema,
  sanitizeOutreachMessage,
  toOutreachResults,
} from "@/services/outreach";
import type { OutreachStore } from "@/services/outreach";
import type { AICompletionResult } from "@/types/ai";
import type { Lead } from "@/types/lead";
import type { StoredOutreachMessage } from "@/types/outreach";

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

const VALID_MESSAGE =
  "Olá! Vi que a Academia Teste tem 4,7 no Google, mas não encontrei um site com os planos. " +
  "Uma página simples com planos e aula experimental ajudaria quem procura na internet. Faz sentido conversarmos?";

function stored(overrides: Partial<StoredOutreachMessage> = {}): StoredOutreachMessage {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    leadId: "11111111-1111-4111-8111-111111111111",
    batchId: "55555555-5555-4555-8555-555555555555",
    style: "CONSULTIVE",
    message: VALID_MESSAGE,
    reason: "A empresa tem boa reputação no Google e nenhum site.",
    isEdited: false,
    usedAt: null,
    provider: "lovable",
    model: "google/gemini-2.5-flash",
    businessProfile: "GYM",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
    ...overrides,
  };
}

function memoryStore(): OutreachStore & { saved: StoredOutreachMessage[]; history: string[] } {
  const state = {
    saved: [] as StoredOutreachMessage[],
    history: [] as string[],
  };

  return {
    ...state,
    loadLead: async () => lead(),
    latestAudit: async () => null,
    latestAnalysis: async () => null,
    latestOffer: async () => null,
    latestMessages: async () => state.saved,
    saveMessages: async (leadId, input) => {
      state.saved = input.results.map((result, index) =>
        stored({
          id: `id-${index}`,
          leadId,
          batchId: input.batchId,
          style: result.style,
          message: result.message,
          reason: result.reason,
        }),
      );
      return state.saved;
    },
    updateMessage: async (id, message) => stored({ id, message, isEdited: true }),
    markUsed: async (id, usedAt) => stored({ id, usedAt: usedAt.toISOString() }),
    registerInteraction: async (input) => {
      state.history.push(`${input.subject}|${input.content}`);
    },
    get saved() {
      return state.saved;
    },
    get history() {
      return state.history;
    },
  } as OutreachStore & { saved: StoredOutreachMessage[]; history: string[] };
}

function providerReturning(text: string): AIProvider {
  return {
    name: "lovable",
    model: "google/gemini-2.5-flash",
    complete: vi.fn(
      async (): Promise<AICompletionResult> => ({
        text,
        provider: "lovable",
        model: "google/gemini-2.5-flash",
        finishReason: "stop",
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      }),
    ),
  };
}

describe("sanitizeOutreachMessage", () => {
  it("accepts a short, contextual message ending with a question", () => {
    expect(sanitizeOutreachMessage(VALID_MESSAGE)).toContain("Faz sentido conversarmos?");
  });

  it("rejects messages with false promises", () => {
    expect(
      sanitizeOutreachMessage("Garantimos o dobro de alunos em 30 dias. Podemos conversar?"),
    ).toBeNull();
  });

  it("rejects spam wording", () => {
    expect(
      sanitizeOutreachMessage(
        "Última chance! Clique agora e fale com a gente sobre a sua academia. Vamos?",
      ),
    ).toBeNull();
  });

  it("rejects messages that do not end with a question", () => {
    expect(
      sanitizeOutreachMessage(
        "Vi que a Academia Teste não tem site com os planos publicados hoje na internet.",
      ),
    ).toBeNull();
  });

  it("drops statements written after the final question", () => {
    const message = sanitizeOutreachMessage(`${VALID_MESSAGE} Aguardo o seu retorno.`);
    expect(message?.endsWith("?")).toBe(true);
  });

  it("removes markdown noise", () => {
    expect(sanitizeOutreachMessage(`**${VALID_MESSAGE}**`)).not.toContain("*");
  });
});

describe("outreach schema and mapper", () => {
  it("normalizes Portuguese style names", () => {
    const parsed = outreachResponseSchema.parse({
      messages: [{ style: "consultiva", message: VALID_MESSAGE, reason: "Sem site." }],
    });
    expect(parsed.messages[0]?.style).toBe("CONSULTIVE");
  });

  it("keeps one message per requested style, in order", () => {
    const results = toOutreachResults(
      [
        { style: "OPPORTUNITY", message: VALID_MESSAGE, reason: "r" },
        { style: "CONSULTIVE", message: VALID_MESSAGE, reason: "r" },
        { style: "CONSULTIVE", message: VALID_MESSAGE, reason: "duplicada" },
      ],
      OUTREACH_STYLES,
    );

    expect(results.map((item) => item.style)).toEqual(["CONSULTIVE", "OPPORTUNITY"]);
  });

  it("discards non-compliant suggestions instead of fixing them", () => {
    const results = toOutreachResults(
      [{ style: "DIRECT", message: "Garantimos mais clientes para você. Vamos conversar?", reason: "r" }],
      OUTREACH_STYLES,
    );
    expect(results).toEqual([]);
  });
});

describe("outreach prompt", () => {
  it("sends only observed data", () => {
    const payload = buildOutreachPayload({ lead: lead() });
    expect(payload["empresa"]).toBe("Academia Teste");
    expect(payload["avaliacaoGoogle"]).toBe(4.7);
    expect(payload["ofertaRecomendada"]).toBeNull();
  });

  it("forbids inventing information and requires a closing question", () => {
    const instructions = buildOutreachInstructions("GYM", OUTREACH_STYLES);
    expect(instructions).toContain("proibido inventar");
    expect(instructions).toContain("pergunta simples");
    expect(instructions).toContain("nunca será enviada automaticamente");
  });
});

describe("OutreachService", () => {
  const response = JSON.stringify({
    messages: OUTREACH_STYLES.map((style) => ({
      style,
      message: VALID_MESSAGE,
      reason: "Sem site e boa reputação no Google.",
    })),
  });

  it("generates one suggestion per style and never sends anything", async () => {
    const store = memoryStore();
    const provider = providerReturning(response);
    const service = new OutreachService(store, new LLMService(provider));

    const messages = await service.generate("11111111-1111-4111-8111-111111111111");

    expect(messages).toHaveLength(OUTREACH_STYLES.length);
    expect(store.history).toEqual([]);
  });

  it("rejects a batch where every message breaks the rules", async () => {
    const store = memoryStore();
    const bad = JSON.stringify({
      messages: [
        {
          style: "DIRECT",
          message: "Garantimos 100% de retorno para a sua academia agora mesmo. Vamos?",
          reason: "r",
        },
      ],
    });
    const service = new OutreachService(store, new LLMService(providerReturning(bad)));

    await expect(service.generate("11111111-1111-4111-8111-111111111111")).rejects.toThrow();
  });

  it("registers the approach in the lead history when marked as used", async () => {
    const store = memoryStore();
    const service = new OutreachService(store, new LLMService(providerReturning(response)));

    const used = await service.markUsed("id-0", { now: new Date("2026-02-01T10:00:00.000Z") });

    expect(used.usedAt).toBe("2026-02-01T10:00:00.000Z");
    expect(store.history[0]).toContain("utilizada");
  });
});
