import { z } from "zod";

import {
  AUDIT_PROBLEM_AREAS,
  AUDIT_SECTIONS,
  AUDIT_SEVERITIES,
  type AuditProblemArea,
  type AuditSection,
  type AuditSeverity,
} from "@/config/digital-audit";
import { OFFER_LIMITS, OFFER_TYPES, type OfferType } from "@/config/offer";

/**
 * Response contract for the offer recommendation.
 *
 * Strict about meaning, tolerant of harmless formatting habits (lowercase enums,
 * Portuguese aliases, a single item instead of a list). Anything that cannot be
 * normalised is rejected — nothing is persisted from an invalid response.
 */

const statement = z.string().trim().min(3).max(OFFER_LIMITS.maxStatementChars);
const shortText = (max: number) => z.string().trim().min(2).max(max);

function normalizeEnum(value: unknown): unknown {
  return typeof value === "string"
    ? value
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s-]+/g, "_")
    : value;
}

const TYPE_ALIASES: Record<string, OfferType> = {
  INSTITUCIONAL: "INSTITUTIONAL",
  CATALOGO: "CATALOG",
  GERACAO_DE_LEADS: "LEAD_GENERATION",
  CAPTACAO_DE_LEADS: "LEAD_GENERATION",
  LEADS: "LEAD_GENERATION",
  AGENDAMENTO: "APPOINTMENT",
  ORCAMENTO: "QUOTE",
  NEGOCIO_LOCAL: "LOCAL_BUSINESS",
  LOCAL: "LOCAL_BUSINESS",
  PROMOCIONAL: "PROMOTIONAL",
  PROMOCAO: "PROMOTIONAL",
  VITRINE: "PRODUCT_SHOWCASE",
  VITRINE_DE_PRODUTOS: "PRODUCT_SHOWCASE",
};

const SECTION_ALIASES: Record<string, AuditSection> = {
  BANNER: "HERO",
  TOPO: "HERO",
  PLANOS: "PLANS",
  MENSALIDADES: "PLANS",
  MODALIDADES: "MODALITIES",
  PROFESSORES: "TEAM",
  EQUIPE: "TEAM",
  DEPOIMENTOS: "TESTIMONIALS",
  LOCALIZACAO: "LOCATION",
  MAPA: "LOCATION",
  VEICULOS: "VEHICLES",
  DETALHES: "VEHICLE_DETAILS",
  DETALHES_DO_VEICULO: "VEHICLE_DETAILS",
  FINANCIAMENTO: "FINANCING",
  AVALIACOES: "REVIEWS",
  COLECOES: "COLLECTIONS",
  PRODUTOS: "PRODUCTS",
  CATALOGO: "PRODUCTS",
  PROMOCOES: "PROMOTIONS",
  INSTAGRAM: "INSTAGRAM_FEED",
  PORTFOLIO: "PORTFOLIO",
  ORCAMENTO: "QUOTE_FORM",
  AGENDAMENTO: "SCHEDULING",
  AGENDA: "SCHEDULING",
  CARDAPIO: "MENU",
  SERVICOS: "SERVICES_LIST",
  DUVIDAS: "FAQ",
  PERGUNTAS_FREQUENTES: "FAQ",
  CONTATO: "CONTACT_FORM",
  FORMULARIO: "CONTACT_FORM",
  FORMULARIO_DE_CONTATO: "CONTACT_FORM",
};

const AREA_ALIASES: Record<string, AuditProblemArea> = {
  SITE: "WEBSITE",
  QUALIDADE_DO_SITE: "WEBSITE_QUALITY",
  QUALIDADE: "WEBSITE_QUALITY",
  CONTATO: "CONTACT",
  CHAMADA_PARA_ACAO: "CTA",
  CATALOGO: "CATALOG",
  AGENDAMENTO: "SCHEDULING",
  ORCAMENTO: "QUOTE",
  REDES_SOCIAIS: "SOCIAL",
  SOCIAL_MEDIA: "SOCIAL",
  REPUTACAO: "REPUTATION",
  PRESENCA_DIGITAL: "DIGITAL_PRESENCE",
};

const SEVERITY_ALIASES: Record<string, AuditSeverity> = {
  ALTA: "HIGH",
  ALTO: "HIGH",
  MEDIA: "MEDIUM",
  MEDIO: "MEDIUM",
  BAIXA: "LOW",
  BAIXO: "LOW",
};

const offerTypeField = z.preprocess((value) => {
  const normalized = normalizeEnum(value);
  return typeof normalized === "string" ? (TYPE_ALIASES[normalized] ?? normalized) : normalized;
}, z.enum(OFFER_TYPES));

const sectionField = z.preprocess((value) => {
  const normalized = normalizeEnum(value);
  return typeof normalized === "string" ? (SECTION_ALIASES[normalized] ?? normalized) : normalized;
}, z.enum(AUDIT_SECTIONS));

const areaField = z.preprocess((value) => {
  const normalized = normalizeEnum(value);
  return typeof normalized === "string" ? (AREA_ALIASES[normalized] ?? normalized) : normalized;
}, z.enum(AUDIT_PROBLEM_AREAS));

const severityField = z.preprocess((value) => {
  const normalized = normalizeEnum(value);
  return typeof normalized === "string" ? (SEVERITY_ALIASES[normalized] ?? normalized) : normalized;
}, z.enum(AUDIT_SEVERITIES));

export const offerSectionSchema = z.object({
  section: sectionField,
  justification: statement,
});

export const offerLinkedProblemSchema = z.object({
  area: areaField,
  severity: severityField,
  problem: statement,
});

function toArray(max: number) {
  return (value: unknown): unknown => {
    const items = Array.isArray(value)
      ? value
      : value === undefined || value === null
        ? []
        : [value];
    return items.slice(0, max);
  };
}

/** Optional text: empty strings and placeholders become undefined. */
const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value ?? undefined;
    const text = value.trim();
    if (!text || text === "-" || text.toLowerCase() === "n/a") return undefined;
    return text.slice(0, max);
  }, shortText(max).optional());

const optionalType = z.preprocess((value) => {
  if (value === null || value === "") return undefined;
  return value;
}, offerTypeField.optional());

export const offerRecommendationResponseSchema = z.object({
  offerType: offerTypeField,
  secondaryOfferType: optionalType,
  offerTitle: shortText(OFFER_LIMITS.maxTitleChars),
  mainObjective: statement,
  recommendedSections: z.preprocess(
    toArray(OFFER_LIMITS.maxSections),
    z.array(offerSectionSchema).min(1).max(OFFER_LIMITS.maxSections),
  ),
  conversionStrategy: statement,
  primaryCTA: shortText(OFFER_LIMITS.maxCtaChars),
  secondaryCTA: optionalText(OFFER_LIMITS.maxCtaChars),
  valueProposition: statement,
  linkedProblems: z.preprocess(
    toArray(OFFER_LIMITS.maxLinkedProblems),
    z.array(offerLinkedProblemSchema).min(1).max(OFFER_LIMITS.maxLinkedProblems),
  ),
});

export type OfferRecommendationResponse = z.infer<typeof offerRecommendationResponseSchema>;
