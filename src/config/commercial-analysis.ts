/**
 * Business profiles for the commercial analysis.
 *
 * A profile only changes WHICH questions the model must consider (vocabulary and
 * conversion levers of that segment). It never asserts facts about the lead —
 * facts always come from the observed data sent in the payload.
 */

export const BUSINESS_PROFILES = [
  "GYM",
  "CAR_DEALER",
  "CLOTHING",
  "FURNITURE",
  "FOOD",
  "HEALTH",
  "SERVICES",
  "GENERIC",
] as const;

export type BusinessProfile = (typeof BUSINESS_PROFILES)[number];

export interface BusinessProfileConfig {
  label: string;
  /** Keywords matched against category/subcategory/description. */
  keywords: string[];
  /** Conversion levers the analysis must consider for this segment. */
  focus: string[];
}

export const BUSINESS_PROFILE_CONFIG: Record<BusinessProfile, BusinessProfileConfig> = {
  GYM: {
    label: "Academia / estúdio",
    keywords: ["academia", "gym", "crossfit", "pilates", "musculação", "studio", "estúdio", "fitness", "personal"],
    focus: ["matrícula", "planos e mensalidades", "modalidades", "agendamento de aula experimental"],
  },
  CAR_DEALER: {
    label: "Loja de veículos",
    keywords: ["carro", "veículo", "veiculos", "automóvel", "automovel", "revenda", "seminovos", "concessionária", "concessionaria", "moto"],
    focus: ["estoque atualizado", "catálogo de veículos", "simulação de financiamento", "captação de leads"],
  },
  CLOTHING: {
    label: "Moda / vestuário",
    keywords: ["roupa", "moda", "boutique", "vestuário", "vestuario", "loja de roupas", "calçado", "calcado", "bijuteria", "acessórios"],
    focus: ["coleção atual", "catálogo de produtos", "vitrine no Instagram", "venda por WhatsApp"],
  },
  FURNITURE: {
    label: "Móveis / marcenaria",
    keywords: ["móvel", "movel", "móveis", "moveis", "marcenaria", "planejados", "decoração", "decoracao", "interiores"],
    focus: ["portfólio de projetos", "solicitação de orçamento", "geração de leads qualificados"],
  },
  FOOD: {
    label: "Alimentação",
    keywords: ["restaurante", "pizzaria", "lanchonete", "padaria", "café", "cafeteria", "bar", "hamburgueria", "delivery", "açaí"],
    focus: ["menu digital", "pedido por delivery", "reserva", "promoções recorrentes"],
  },
  HEALTH: {
    label: "Saúde / clínica",
    keywords: ["clínica", "clinica", "odonto", "dentista", "psicolog", "fisioterapia", "estética", "estetica", "veterin", "consultório"],
    focus: ["agendamento de consulta", "confiança e prova social", "convênios e especialidades"],
  },
  SERVICES: {
    label: "Serviços locais",
    keywords: ["serviço", "servico", "assistência", "assistencia", "manutenção", "manutencao", "reforma", "advocacia", "contabil", "conserto"],
    focus: ["solicitação de orçamento", "área de atendimento", "prova de resultados", "contato rápido"],
  },
  GENERIC: {
    label: "Negócio local",
    keywords: [],
    focus: ["captação de contato", "apresentação da oferta", "prova social", "canal de atendimento"],
  },
};

export const ANALYSIS_LIMITS = {
  /** Max items accepted per list in the model response. */
  maxListItems: 6,
  /** Max characters per statement (longer strings are rejected by the schema). */
  maxStatementChars: 400,
  /** Evidence items sent as context to the model. */
  maxContextEvidence: 12,
  maxOutputTokens: 1_200,
  temperature: 0.2,
  task: "lead.commercial-analysis",
} as const;

/** Picks the profile from the lead's own text fields (no external lookup). */
export function detectBusinessProfile(input: {
  businessCategory?: string | null;
  businessSubcategory?: string | null;
  description?: string | null;
  companyName?: string | null;
}): BusinessProfile {
  const haystack = [
    input.businessSubcategory,
    input.businessCategory,
    input.companyName,
    input.description,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ")
    .toLowerCase();

  if (!haystack) return "GENERIC";

  for (const profile of BUSINESS_PROFILES) {
    const config = BUSINESS_PROFILE_CONFIG[profile];
    if (config.keywords.some((keyword) => haystack.includes(keyword))) return profile;
  }

  return "GENERIC";
}
