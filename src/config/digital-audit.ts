import type { BusinessProfile } from "@/config/commercial-analysis";

/**
 * Configuration of the Digital Audit.
 *
 * The catalogue below is the ONLY set of sections the audit may recommend, and
 * each business profile has its own allowlist. This is what keeps the model from
 * dumping every possible section on every lead: anything outside the profile's
 * allowlist is discarded, and every recommended section must carry its own
 * justification (validated by the schema).
 */

export const AUDIT_SECTIONS = [
  "HERO",
  "PLANS",
  "MODALITIES",
  "TEAM",
  "TESTIMONIALS",
  "LOCATION",
  "WHATSAPP",
  "VEHICLES",
  "VEHICLE_DETAILS",
  "FINANCING",
  "REVIEWS",
  "COLLECTIONS",
  "PRODUCTS",
  "PROMOTIONS",
  "INSTAGRAM_FEED",
  "PORTFOLIO",
  "QUOTE_FORM",
  "SCHEDULING",
  "MENU",
  "DELIVERY",
  "SERVICES_LIST",
  "FAQ",
  "CONTACT_FORM",
] as const;

export type AuditSection = (typeof AUDIT_SECTIONS)[number];

export const AUDIT_SECTION_LABELS: Record<AuditSection, string> = {
  HERO: "Hero",
  PLANS: "Planos",
  MODALITIES: "Modalidades",
  TEAM: "Professores / equipe",
  TESTIMONIALS: "Depoimentos",
  LOCATION: "Localização",
  WHATSAPP: "WhatsApp",
  VEHICLES: "Veículos",
  VEHICLE_DETAILS: "Detalhes do veículo",
  FINANCING: "Financiamento",
  REVIEWS: "Avaliações",
  COLLECTIONS: "Coleções",
  PRODUCTS: "Produtos",
  PROMOTIONS: "Promoções",
  INSTAGRAM_FEED: "Instagram",
  PORTFOLIO: "Portfólio",
  QUOTE_FORM: "Orçamento",
  SCHEDULING: "Agendamento",
  MENU: "Menu",
  DELIVERY: "Delivery",
  SERVICES_LIST: "Serviços",
  FAQ: "Dúvidas frequentes",
  CONTACT_FORM: "Formulário de contato",
};

/** Sections allowed per segment (nothing outside this list is recommended). */
export const AUDIT_PROFILE_SECTIONS: Record<BusinessProfile, AuditSection[]> = {
  GYM: [
    "HERO",
    "PLANS",
    "MODALITIES",
    "TEAM",
    "TESTIMONIALS",
    "SCHEDULING",
    "LOCATION",
    "WHATSAPP",
  ],
  CAR_DEALER: [
    "HERO",
    "VEHICLES",
    "VEHICLE_DETAILS",
    "FINANCING",
    "REVIEWS",
    "LOCATION",
    "WHATSAPP",
    "CONTACT_FORM",
  ],
  CLOTHING: [
    "HERO",
    "COLLECTIONS",
    "PRODUCTS",
    "PROMOTIONS",
    "INSTAGRAM_FEED",
    "LOCATION",
    "WHATSAPP",
  ],
  FURNITURE: [
    "HERO",
    "PORTFOLIO",
    "PRODUCTS",
    "QUOTE_FORM",
    "TESTIMONIALS",
    "LOCATION",
    "WHATSAPP",
  ],
  FOOD: ["HERO", "MENU", "PROMOTIONS", "DELIVERY", "REVIEWS", "LOCATION", "WHATSAPP"],
  HEALTH: [
    "HERO",
    "SERVICES_LIST",
    "SCHEDULING",
    "TEAM",
    "TESTIMONIALS",
    "FAQ",
    "LOCATION",
    "WHATSAPP",
  ],
  SERVICES: [
    "HERO",
    "SERVICES_LIST",
    "QUOTE_FORM",
    "PORTFOLIO",
    "TESTIMONIALS",
    "LOCATION",
    "WHATSAPP",
    "CONTACT_FORM",
  ],
  GENERIC: [
    "HERO",
    "SERVICES_LIST",
    "TESTIMONIALS",
    "CONTACT_FORM",
    "LOCATION",
    "WHATSAPP",
    "INSTAGRAM_FEED",
  ],
};

/** Areas a conversion problem can belong to. */
export const AUDIT_PROBLEM_AREAS = [
  "WEBSITE",
  "WEBSITE_QUALITY",
  "CONTACT",
  "CTA",
  "CATALOG",
  "SCHEDULING",
  "QUOTE",
  "SOCIAL",
  "REPUTATION",
  "DIGITAL_PRESENCE",
] as const;

export type AuditProblemArea = (typeof AUDIT_PROBLEM_AREAS)[number];

export const AUDIT_PROBLEM_AREA_LABELS: Record<AuditProblemArea, string> = {
  WEBSITE: "Website",
  WEBSITE_QUALITY: "Qualidade do site",
  CONTACT: "Facilidade de contato",
  CTA: "Chamada para ação",
  CATALOG: "Catálogo",
  SCHEDULING: "Agendamento",
  QUOTE: "Orçamento",
  SOCIAL: "Redes sociais",
  REPUTATION: "Reputação",
  DIGITAL_PRESENCE: "Presença digital",
};

export const AUDIT_SEVERITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export const AUDIT_LIMITS = {
  maxProblems: 6,
  maxSections: 8,
  maxEvidence: 12,
  maxStatementChars: 300,
  maxSummaryChars: 700,
  maxContextEvidence: 12,
  maxOutputTokens: 2_600,
  temperature: 0.2,
  task: "lead.digital-audit",
} as const;
