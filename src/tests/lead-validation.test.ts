import { describe, expect, it } from "vitest";

import { leadInputSchema, updateLeadSchema, listLeadsSchema } from "@/lib/validation/lead";

describe("leadInputSchema", () => {
  it("aceita um lead mínimo válido", () => {
    const result = leadInputSchema.safeParse({ companyName: "Padaria do Bairro" });
    expect(result.success).toBe(true);
  });

  it("rejeita nome de empresa vazio", () => {
    const result = leadInputSchema.safeParse({ companyName: "   " });
    expect(result.success).toBe(false);
  });

  it("normaliza campos opcionais vazios para null", () => {
    const result = leadInputSchema.parse({ companyName: "Empresa X", city: "  " });
    expect(result.city).toBeNull();
  });

  it("rejeita e-mail inválido", () => {
    const result = leadInputSchema.safeParse({ companyName: "Empresa X", email: "invalido" });
    expect(result.success).toBe(false);
  });

  it("rejeita status desconhecido", () => {
    const result = leadInputSchema.safeParse({ companyName: "Empresa X", status: "PENDENTE" });
    expect(result.success).toBe(false);
  });

  it("rejeita coordenadas fora do intervalo", () => {
    const result = leadInputSchema.safeParse({ companyName: "Empresa X", latitude: "999" });
    expect(result.success).toBe(false);
  });
});

describe("updateLeadSchema", () => {
  it("exige um id", () => {
    expect(updateLeadSchema.safeParse({ companyName: "Empresa X" }).success).toBe(false);
  });
});

describe("listLeadsSchema", () => {
  it("aplica valores padrão de paginação", () => {
    const parsed = listLeadsSchema.parse({});
    expect(parsed.page).toBeGreaterThanOrEqual(1);
    expect(parsed.pageSize).toBeGreaterThan(0);
  });
});
