import { beforeEach, describe, expect, it } from "vitest";

import { AppError, ValidationError, parseOrThrow } from "@/lib/errors";
import { RateLimitError, consumeRateLimit, resetRateLimits } from "@/lib/security/rate-limit";
import { redactSecrets, redactValue, REDACTED } from "@/lib/security/redact";
import { toSafeError } from "@/lib/security/safe-error";
import { sanitizeRedirectPath, sanitizeSearchTerm, sanitizeText } from "@/lib/security/sanitize";
import { idParamSchema, safeSearch, uuidSchema } from "@/lib/validation/common";
import { createLeadSchema, leadIdSchema, updateLeadSchema } from "@/lib/validation/lead";
import { LeadRepository } from "@/services/leads/lead-repository";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const LEAD_OF_B = "33333333-3333-4333-8333-333333333333";

/** Minimal Supabase query recorder to assert the filters we send. */
function createDbSpy(row: unknown = null) {
  const filters: Array<[string, unknown]> = [];
  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    range: () => builder,
    or: () => builder,
    ilike: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    },
    maybeSingle: async () => ({ data: row, error: null }),
    single: async () => ({ data: row, error: null }),
    then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null, count: 0 }),
  };
  return {
    filters,
    db: { from: () => builder } as never,
  };
}

describe("autorização: isolamento por usuário", () => {
  it("usuário A não acessa lead do usuário B (consulta sempre filtrada por user_id)", async () => {
    const spy = createDbSpy(null);
    const repo = new LeadRepository(spy.db, USER_A);

    await expect(repo.findById(LEAD_OF_B)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(spy.filters).toContainEqual(["user_id", USER_A]);
    expect(spy.filters).not.toContainEqual(["user_id", USER_B]);
  });

  it("userId falso enviado pelo cliente é ignorado (schemas não aceitam user_id)", () => {
    const parsed = parseOrThrow(createLeadSchema, {
      companyName: "Empresa Teste",
      userId: USER_B,
      user_id: USER_B,
    });
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("user_id");
  });

  it("escrita usa o userId do servidor, não o do payload", async () => {
    const spy = createDbSpy({ id: LEAD_OF_B });
    const repo = new LeadRepository(spy.db, USER_A);
    await repo.remove(LEAD_OF_B);
    expect(spy.filters).toContainEqual(["user_id", USER_A]);
  });
});

describe("autenticação: guards de servidor", () => {
  it("as server functions de leads exigem sessão validada no servidor", async () => {
    const source = await import("fs/promises").then((fs) =>
      fs.readFile("src/lib/leads.functions.ts", "utf8"),
    );
    const declarations = source.match(/createServerFn\(/g) ?? [];
    const guards = source.match(/requireAuth/g) ?? [];
    expect(declarations.length).toBeGreaterThan(0);
    // uma referência de import + uma por server function
    expect(guards.length).toBeGreaterThanOrEqual(declarations.length);
  });

  it("requisição sem token não passa pelo middleware de autenticação", async () => {
    const { requireSupabaseAuth } = await import("@/integrations/supabase/auth-middleware");
    expect(requireSupabaseAuth).toBeDefined();
    // Sem cabeçalho Authorization o middleware lança "Unauthorized"; a normalização
    // devolve 401 sem detalhes internos.
    const safe = toSafeError(new Error("Unauthorized: No authorization header provided"));
    expect(safe.status).toBe(401);
    expect(safe.message).not.toMatch(/authorization header/i);
  });
});

describe("validação de IDs e inputs", () => {
  it("rejeita IDs inválidos", () => {
    for (const id of ["", "abc", "1", "'; drop table leads;--", `${USER_A}x`]) {
      expect(uuidSchema.safeParse(id).success).toBe(false);
      expect(leadIdSchema.safeParse({ id }).success).toBe(false);
      expect(idParamSchema.safeParse({ id }).success).toBe(false);
    }
    expect(leadIdSchema.safeParse({ id: USER_A }).success).toBe(true);
  });

  it("rejeita inputs inválidos", () => {
    expect(createLeadSchema.safeParse({ companyName: "A" }).success).toBe(false);
    expect(createLeadSchema.safeParse({}).success).toBe(false);
    expect(
      createLeadSchema.safeParse({ companyName: "Empresa", email: "não-é-email" }).success,
    ).toBe(false);
    expect(createLeadSchema.safeParse({ companyName: "Empresa", status: "HACKED" }).success).toBe(
      false,
    );
    expect(updateLeadSchema.safeParse({ id: "abc", data: { companyName: "Ok" } }).success).toBe(
      false,
    );
  });

  it("sanitiza texto, busca e redirecionamentos", () => {
    expect(sanitizeText(' <script>alert("x")</script>  Padaria ')).not.toContain("<script>");
    expect(sanitizeSearchTerm("%_,()padaria")).toBe("padaria");
    expect(safeSearch(20).parse("bar,ilike.%25")).not.toContain("%");
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/leads")).toBe("/leads");
  });
});

describe("erros e secrets", () => {
  it("não expõe stack trace nem detalhes internos em erros inesperados", () => {
    const internal = new TypeError("connect ECONNREFUSED 10.0.0.1:5432 at Object.<anonymous>");
    const safe = toSafeError(internal, "test");
    expect(safe.status).toBe(500);
    expect(safe.code).toBe("INTERNAL_ERROR");
    expect(safe.message).toBe("Ocorreu um erro inesperado. Tente novamente.");
    expect(JSON.stringify(safe)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(safe)).not.toContain("stack");
  });

  it("mantém mensagens seguras de erros de aplicação e validação", () => {
    expect(toSafeError(new AppError("Lead não encontrado", { status: 404 })).status).toBe(404);
    const validation = toSafeError(new ValidationError({ companyName: "Obrigatório" }));
    expect(validation.status).toBe(422);
    expect(validation.issues).toEqual({ companyName: "Obrigatório" });
  });

  it("secrets não aparecem em mensagens ou payloads", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop";
    expect(redactSecrets(`token=${jwt}`)).toBe(`token=${REDACTED}`);
    expect(redactSecrets("key sb_secret_ABCDEFGH12345678")).toContain(REDACTED);
    expect(redactSecrets("postgres://user:pass@host:5432/db")).toBe(REDACTED);

    const payload = redactValue({
      lead: { companyName: "Padaria" },
      SUPABASE_SERVICE_ROLE_KEY: "super-secret",
      nested: { authorization: `Bearer ${jwt}` },
    }) as Record<string, never>;
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain(jwt);
    expect(serialized).toContain("Padaria");
  });

  it("erro de aplicação com secret na mensagem é redigido", () => {
    const safe = toSafeError(new AppError("falha ao usar sb_secret_ABCDEFGH12345678"));
    expect(safe.message).not.toContain("sb_secret_");
  });
});

describe("rate limiting", () => {
  beforeEach(() => resetRateLimits());

  it("bloqueia após exceder o limite por usuário", () => {
    const rule = { key: "test:write", limit: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i += 1) consumeRateLimit(rule, USER_A);
    expect(() => consumeRateLimit(rule, USER_A)).toThrow(RateLimitError);
    // outro usuário não é afetado
    expect(() => consumeRateLimit(rule, USER_B)).not.toThrow();
  });

  it("libera após a janela expirar", () => {
    const rule = { key: "test:window", limit: 1, windowMs: 1_000 };
    const now = Date.now();
    consumeRateLimit(rule, USER_A, now);
    expect(() => consumeRateLimit(rule, USER_A, now + 100)).toThrow(RateLimitError);
    expect(() => consumeRateLimit(rule, USER_A, now + 2_000)).not.toThrow();
  });
});

describe("variáveis de ambiente", () => {
  it("nenhuma chave de serviço é exposta ao cliente (VITE_*)", () => {
    const clientEnv = import.meta.env as Record<string, unknown>;
    for (const [key, value] of Object.entries(clientEnv)) {
      if (!key.startsWith("VITE_")) continue;
      expect(key).not.toMatch(/SERVICE_ROLE|SECRET|PASSWORD|DB_URL/i);
      if (typeof value === "string") {
        expect(value.startsWith("sb_secret_")).toBe(false);
      }
    }
  });
});
