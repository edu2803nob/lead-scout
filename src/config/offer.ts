import type { BusinessProfile } from "@/config/commercial-analysis";

/**
 * Configuration of the Offer Recommendation module.
 *
 * The offer is never "a website": each offer type is a concrete landing page
 * solution, and only the types that make commercial sense for the detected
 * segment are allowed. The recommendation must always be tied to a commercial
 * problem observed by the audit / analysis (enforced by the service and mapper).
 */

export const OFFER_TYPES = [
  "INSTITUTIONAL",
  "CATALOG",
  "LEAD_GENERATION",
  "APPOINTMENT",
  "QUOTE",
  "LOCAL_BUSINESS",
  "PROMOTIONAL",
  "PRODUCT_SHOWCASE",
] as const;

export type OfferType = (typeof OFFER_TYPES)[number];

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  INSTITUTIONAL: "Institucional",
  CATALOG: "Catálogo",
  LEAD_GENERATION: "Geração de leads",
  APPOINTMENT: "Agendamento",
  QUOTE: "Orçamento",
  LOCAL_BUSINESS: "Negócio local",
  PROMOTIONAL: "Promocional",
  PRODUCT_SHOWCASE: "Vitrine de produtos",
};

/** Offer types allowed per segment (anything outside is discarded). */
export const OFFER_PROFILE_TYPES: Record<BusinessProfile, OfferType[]> = {
  GYM: ["LEAD_GENERATION", "APPOINTMENT", "LOCAL_BUSINESS", "PROMOTIONAL", "INSTITUTIONAL"],
  CAR_DEALER: ["CATALOG", "LEAD_GENERATION", "PRODUCT_SHOWCASE", "LOCAL_BUSINESS", "INSTITUTIONAL"],
  CLOTHING: ["PRODUCT_SHOWCASE", "LOCAL_BUSINESS", "CATALOG", "PROMOTIONAL"],
  FURNITURE: ["QUOTE", "LEAD_GENERATION", "PRODUCT_SHOWCASE", "INSTITUTIONAL"],
  FOOD: ["LOCAL_BUSINESS", "PROMOTIONAL", "CATALOG", "PRODUCT_SHOWCASE"],
  HEALTH: ["APPOINTMENT", "LEAD_GENERATION", "INSTITUTIONAL", "LOCAL_BUSINESS"],
  SERVICES: ["QUOTE", "LEAD_GENERATION", "INSTITUTIONAL", "LOCAL_BUSINESS"],
  GENERIC: [
    "LEAD_GENERATION",
    "LOCAL_BUSINESS",
    "INSTITUTIONAL",
    "QUOTE",
    "APPOINTMENT",
    "CATALOG",
    "PRODUCT_SHOWCASE",
    "PROMOTIONAL",
  ],
};

export const OFFER_LIMITS = {
  maxSections: 8,
  maxLinkedProblems: 6,
  maxStatementChars: 300,
  maxTitleChars: 120,
  maxCtaChars: 60,
  maxContextProblems: 6,
  maxContextItems: 6,
  maxOutputTokens: 2_200,
  temperature: 0.2,
  task: "lead.offer-recommendation",
} as const;
