import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  AIBudgetError,
  AIConfigError,
  AIInvalidResponseError,
  AIProviderError,
  AITimeoutError,
  LLMService,
  buildMinimalPayload,
  createProvider,
  parseStructuredResponse,
  readLLMConfig,
  resetSpend,
} from "@/services/ai";
import type { AIProvider } from "@/services/ai";
import type { AICompletionResult } from "@/types/ai";

const schema = z.object({
  summary: z.string().min(1),
  score: z.number().min(0).max(100),
});

function completion(text: string, overrides: Partial<AICompletionResult> = {}): AICompletionResult {
  return {
    text,
    finishReason: "stop",
    model: "test-model",
    provider: "test",
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    ...overrides,
  };
}

/** Fake provider: the service knows nothing about vendors or SDKs. */
function fakeProvider(
  responses: Array<AICompletionResult | Error>,
): AIProvider & { calls: number; prompts: string[] } {
  let index = 0;
  const state = {
    name: "test",
    model: "test-model",
    calls: 0,
    prompts: [] as string[],
    async complete(request: { prompt: string }) {
      state.calls += 1;
      state.prompts.push(request.prompt);
      const next = responses[Math.min(index, responses.length - 1)];
      index += 1;
      if (next instanceof Error) throw next;
      return next!;
    },
  };
  return state as AIProvider & { calls: number; prompts: string[] };
}

function service(provider: AIProvider, maxAttempts = 3) {
  return new LLMService(provider, { maxAttempts, sleep: async () => {}, retryBaseDelayMs: 0 });
}

const input = {
  task: "test.analysis",
  instructions: "Analise os dados fornecidos.",
  schema,
  data: { companyName: "Padaria Central", category: "ALIMENTACAO" },
};

beforeEach(() => {
  resetSpend();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("LLMService.analyzeStructuredData", () => {
  it("aceita resposta válida e devolve dados tipados + telemetria", async () => {
    const provider = fakeProvider([completion('{"summary":"ok","score":72}')]);
    const result = await service(provider).analyzeStructuredData(input);

    expect(result.data).toEqual({ summary: "ok", score: 72 });
    expect(result.telemetry.attempts).toBe(1);
    expect(result.telemetry.task).toBe("test.analysis");
    expect(result.telemetry.estimatedCostUsd).toBeGreaterThan(0);
    expect(result.telemetry.inputFields).toEqual(["companyName", "category"]);
  });

  it("aceita JSON dentro de bloco de código", async () => {
    const provider = fakeProvider([completion('```json\n{"summary":"ok","score":10}\n```')]);
    const result = await service(provider).analyzeStructuredData(input);
    expect(result.data.score).toBe(10);
  });

  it("rejeita JSON inválido após retry controlado", async () => {
    const provider = fakeProvider([completion("isto não é json")]);
    await expect(service(provider).analyzeStructuredData(input)).rejects.toBeInstanceOf(
      AIInvalidResponseError,
    );
    expect(provider.calls).toBe(3);
  });

  it("recupera de um JSON inválido inicial e valida a segunda tentativa", async () => {
    const provider = fakeProvider([
      completion("sem json aqui"),
      completion('{"summary":"ok","score":5}'),
    ]);
    const result = await service(provider).analyzeStructuredData(input);
    expect(result.telemetry.attempts).toBe(2);
  });

  it("propaga timeout como AITimeoutError sem detalhes internos", async () => {
    const provider = fakeProvider([new AITimeoutError(30_000)]);
    await expect(service(provider).analyzeStructuredData(input)).rejects.toBeInstanceOf(
      AITimeoutError,
    );
    expect(provider.calls).toBe(3);
  });

  it("erro do provider não retryável falha imediatamente", async () => {
    const provider = fakeProvider([
      new AIProviderError("Requisição de IA inválida.", { providerStatus: 400, retryable: false }),
    ]);
    await expect(service(provider).analyzeStructuredData(input)).rejects.toBeInstanceOf(
      AIProviderError,
    );
    expect(provider.calls).toBe(1);
  });

  it("resposta incompleta (limite de tokens) é rejeitada", async () => {
    const provider = fakeProvider([
      completion('{"summary":"ok","score', { finishReason: "length" }),
    ]);
    await expect(service(provider, 1).analyzeStructuredData(input)).rejects.toMatchObject({
      reason: "TRUNCATED",
    });
  });

  it("resposta vazia é rejeitada", async () => {
    const provider = fakeProvider([completion("   ")]);
    await expect(service(provider, 1).analyzeStructuredData(input)).rejects.toMatchObject({
      reason: "EMPTY",
    });
  });

  it("conteúdo inesperado (JSON fora do schema) é rejeitado", async () => {
    const provider = fakeProvider([completion('{"summary":"ok","score":"muito alto"}')]);
    await expect(service(provider, 1).analyzeStructuredData(input)).rejects.toMatchObject({
      reason: "SCHEMA_MISMATCH",
    });
  });

  it("array ou texto solto no lugar de objeto é rejeitado", async () => {
    const provider = fakeProvider([completion("[1,2,3]")]);
    await expect(service(provider, 1).analyzeStructuredData(input)).rejects.toBeInstanceOf(
      AIInvalidResponseError,
    );
  });
});

describe("dados mínimos e privacidade", () => {
  it("envia somente os campos necessários, sem nulos e sem credenciais", () => {
    const { payload, fields } = buildMinimalPayload({
      companyName: "Padaria",
      phone: null,
      notes: "   ",
      api_key: "sb_secret_ABCDEFGH12345678",
      accessToken: "abc",
      tags: [],
      rating: 4.5,
    });

    expect(fields).toEqual(["companyName", "rating"]);
    expect(JSON.stringify(payload)).not.toContain("sb_secret_");
  });

  it("trunca valores muito longos e sinaliza na telemetria", async () => {
    const provider = fakeProvider([completion('{"summary":"ok","score":1}')]);
    const result = await service(provider).analyzeStructuredData({
      ...input,
      data: { html: "a".repeat(5_000) },
    });
    expect(result.telemetry.truncated).toBe(true);
  });

  it("o prompt não é persistido na telemetria (apenas nomes de campos)", async () => {
    const provider = fakeProvider([completion('{"summary":"ok","score":1}')]);
    const result = await service(provider).analyzeStructuredData(input);
    const serialized = JSON.stringify(result.telemetry);
    expect(serialized).not.toContain("Padaria Central");
    expect(serialized).toContain("companyName");
  });
});

describe("controle de custo", () => {
  it("bloqueia quando o subject excede o orçamento da janela", async () => {
    const provider = fakeProvider([
      completion('{"summary":"ok","score":1}', {
        usage: { inputTokens: 5_000_000, outputTokens: 0, totalTokens: 5_000_000 },
      }),
    ]);
    const svc = service(provider);
    await svc.analyzeStructuredData({ ...input, subject: "user-1" });
    await expect(svc.analyzeStructuredData({ ...input, subject: "user-1" })).rejects.toBeInstanceOf(
      AIBudgetError,
    );
  });
});

describe("configuração", () => {
  it("usa defaults e falha sem chave configurada", () => {
    expect(() => readLLMConfig({})).toThrow(AIConfigError);
    const config = readLLMConfig({ LOVABLE_API_KEY: "key" });
    expect(config.provider).toBe("lovable");
    expect(createProvider(config).name).toBe("lovable");
  });

  it("respeita LLM_PROVIDER, LLM_MODEL e LLM_API_KEY", () => {
    const config = readLLMConfig({
      LLM_PROVIDER: "openai-compatible",
      LLM_MODEL: "some/model",
      LLM_API_KEY: "key",
      LLM_BASE_URL: "https://example.test/v1",
    });
    expect(config.model).toBe("some/model");
    expect(createProvider(config).name).toBe("openai-compatible");
  });

  it("provedor desconhecido é rejeitado", () => {
    expect(() => readLLMConfig({ LLM_PROVIDER: "acme", LLM_API_KEY: "key" })).toThrow(AIConfigError);
  });
});

describe("parseStructuredResponse", () => {
  it("ignora texto ao redor do objeto JSON", () => {
    const data = parseStructuredResponse(schema, 'Claro! {"summary":"ok","score":3} pronto.');
    expect(data.summary).toBe("ok");
  });

  it("rejeita objeto não balanceado", () => {
    expect(() => parseStructuredResponse(schema, '{"summary":"ok"')).toThrow(AIInvalidResponseError);
  });
});
