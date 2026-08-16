import { describe, expect, it } from "vitest";

import { clampScore, getScoreBand, getScoreLabel } from "@/lib/design/score";

describe("faixas de score", () => {
  it("classifica muito alto entre 80 e 100", () => {
    expect(getScoreBand(80)).toBe("VERY_HIGH");
    expect(getScoreBand(100)).toBe("VERY_HIGH");
  });

  it("classifica alto entre 60 e 79", () => {
    expect(getScoreBand(60)).toBe("HIGH");
    expect(getScoreBand(79)).toBe("HIGH");
  });

  it("classifica médio entre 40 e 59", () => {
    expect(getScoreBand(40)).toBe("MEDIUM");
    expect(getScoreBand(59)).toBe("MEDIUM");
  });

  it("classifica baixo entre 0 e 39", () => {
    expect(getScoreBand(0)).toBe("LOW");
    expect(getScoreBand(39)).toBe("LOW");
  });

  it("limita valores fora da faixa", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(Number.NaN)).toBe(0);
  });

  it("expõe rótulos legíveis", () => {
    expect(getScoreLabel(92)).toBe("Muito alto");
    expect(getScoreLabel(10)).toBe("Baixo");
  });
});
