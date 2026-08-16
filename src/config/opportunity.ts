/**
 * Single source of truth for the Landing Page Opportunity engine.
 *
 * This is intentionally separate from `src/config/scoring.ts`: the Lead Score
 * answers "is this business commercially interesting?" while this engine answers
 * "how well does a landing page fit this business?". No magic numbers live
 * outside this file.
 */

export const OPPORTUNITY_TYPES = [
  "NO_WEBSITE",
  "WEAK_WEBSITE",
  "CONVERSION",
  "CATALOG",
  "LEAD_GENERATION",
  "APPOINTMENT",
  "QUOTE",
  "DIGITAL_PRESENCE",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  NO_WEBSITE: "Sem site",
  WEAK_WEBSITE: "Site fraco",
  CONVERSION: "Conversão",
  CATALOG: "Catálogo",
  LEAD_GENERATION: "Geração de leads",
  APPOINTMENT: "Agendamento",
  QUOTE: "Orçamento",
  DIGITAL_PRESENCE: "Presença digital",
};

/** Dimensions of the opportunity score (weights must sum to 1). */
export const OPPORTUNITY_WEIGHTS = {
  /** Gap between the current site (or lack of it) and what a landing page does. */
  gap: 0.4,
  /** Evidence that demand already exists and is being wasted. */
  demand: 0.25,
  /** How well the business model / offer maps to a landing page. */
  fit: 0.2,
  /** Channels a landing page could plug the traffic into. */
  channel: 0.15,
} as const;

export const OPPORTUNITY_BOUNDS = { min: 0, max: 100 } as const;

/** Gap dimension: how much room a landing page has to improve the status quo. */
export const OPPORTUNITY_GAP_POINTS = {
  websiteQuality: {
    NO_WEBSITE: 100,
    WEAK: 80,
    AVERAGE: 55,
    GOOD: 25,
    EXCELLENT: 10,
    UNKNOWN: 50,
  },
  /** Site declared but never verified stays neutral (never guessed). */
  noWebsiteButActiveSocialBonus: 10,
} as const;

/** Demand dimension: public evidence of existing audience/interest. */
export const OPPORTUNITY_DEMAND_CONFIG = {
  reviewsSaturation: 300,
  reviewsMaxPoints: 45,
  followersSaturation: 40_000,
  followersMaxPoints: 35,
  ratingFloor: 3.8,
  ratingPoints: 20,
  /** Used when there is no public evidence at all (neutral, not punitive). */
  unknownScore: 30,
} as const;

/** Fit dimension: landing page adherence per business model. */
export const OPPORTUNITY_MODEL_FIT: Record<string, number> = {
  LEAD_GENERATION: 100,
  QUOTE: 95,
  APPOINTMENT: 92,
  SUBSCRIPTION: 85,
  ONLINE_SALE: 78,
  DELIVERY: 72,
  PRODUCT_AND_SERVICE: 70,
  SERVICE: 70,
  PRODUCT: 62,
  LOCAL_SALE: 58,
};

export const OPPORTUNITY_FIT_CONFIG = {
  unknownModelScore: 55,
  /** Bonus when the category profile is confirmed by the catalog. */
  categoryProfileBonus: 12,
} as const;

/** Channel dimension: where a landing page can send the visitor. */
export const OPPORTUNITY_CHANNEL_POINTS = {
  whatsapp: 45,
  phone: 25,
  email: 15,
  socialProfile: 15,
  /** No reachable channel at all: a landing page must create one. */
  noChannelScore: 20,
} as const;

/**
 * Category/subcategory profiles. These are HINTS only — a type is never
 * emitted from the category alone, it must be confirmed by lead evidence.
 */
export const CATEGORY_OPPORTUNITY_HINTS: Array<{
  keywords: string[];
  types: OpportunityType[];
  label: string;
}> = [
  {
    keywords: ["academia", "crossfit", "pilates", "studio", "personal", "clinica", "clínica", "odont", "fisio", "psicolog", "salao", "salão", "barbear", "estetica", "estética", "spa", "petshop", "pet shop", "veterin"],
    types: ["APPOINTMENT", "LEAD_GENERATION", "CONVERSION"],
    label: "Negócio com agenda e matrícula/plano",
  },
  {
    keywords: ["carro", "veicul", "veícul", "seminov", "concession", "moto", "revenda", "auto center", "autocenter"],
    types: ["CATALOG", "LEAD_GENERATION", "QUOTE"],
    label: "Negócio de estoque e financiamento",
  },
  {
    keywords: ["roupa", "moda", "boutique", "calcad", "calçad", "loja", "joalh", "otica", "ótica", "movei", "móvei", "decorac", "decoraç", "presente"],
    types: ["CATALOG", "CONVERSION"],
    label: "Negócio de vitrine e coleção",
  },
  {
    keywords: ["planejad", "marmor", "mármor", "vidrac", "vidraç", "reforma", "construc", "construç", "arquitet", "engenh", "serralher", "climatiz", "energia solar", "solar", "advocac", "contabil", "contábil", "consultor"],
    types: ["QUOTE", "LEAD_GENERATION"],
    label: "Negócio de portfólio e orçamento",
  },
  {
    keywords: ["restaurante", "pizzari", "lanchon", "hamburg", "cafeteria", "acai", "açaí", "padari", "bar", "delivery", "doceria", "sorveter"],
    types: ["CONVERSION", "CATALOG"],
    label: "Negócio de pedido e menu",
  },
  {
    keywords: ["imobili", "corretor", "aluguel", "imove", "imóve"],
    types: ["CATALOG", "LEAD_GENERATION", "QUOTE"],
    label: "Negócio de portfólio e captação",
  },
];

/** Evidence needed before a hinted type is emitted. */
export const OPPORTUNITY_TYPE_MIN_SCORE = 45;

/** Classification-free bands used only for UI copy. */
export const OPPORTUNITY_BANDS = [
  { level: "VERY_HIGH", min: 80 },
  { level: "HIGH", min: 60 },
  { level: "MEDIUM", min: 40 },
  { level: "LOW", min: 0 },
] as const;
