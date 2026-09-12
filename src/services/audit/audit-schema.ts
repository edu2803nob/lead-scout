import { z } from "zod";

import {
  AUDIT_LIMITS,
  AUDIT_PROBLEM_AREAS,
  AUDIT_SECTIONS,
  AUDIT_SEVERITIES,
  type AuditProblemArea,
  type AuditSection,
  type AuditSeverity,
} from "@/config/digital-audit";
import { ANALYSIS_STATEMENT_KINDS, type AnalysisStatementKind } from "@/types/analysis";

/**
 * Response contract for the Digital Audit.
 *
 * Strict about meaning, tolerant of harmless formatting habits (lowercase enums,
 * Portuguese aliases, a single item instead of a list). Anything that cannot be
 * normalised is rejected — nothing is persisted from an invalid response.
 */

const statement = z.string().trim().min(3).max(AUDIT_LIMITS.maxStatementChars);

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
  ESTOQUE: "VEHICLES",
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
  MENU: "MENU",
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
  WEBSITE: "WEBSITE",
  QUALIDADE_DO_SITE: "WEBSITE_QUALITY",
  QUALIDADE: "WEBSITE_QUALITY",
  CONTATO: "CONTACT",
  CHAMADA_PARA_ACAO: "CTA",
  CATALOGO: "CATALOG",
  AGENDAMENTO: "SCHEDULING",
  ORCAMENTO: "QUOTE",
  REDES_SOCIAIS: "SOCIAL",
  INSTAGRAM: "SOCIAL",
  REPUTACAO: "REPUTATION",
  PRESENCA_DIGITAL: "DIGITAL_PRESENCE",
};

const SEVERITY_ALIASES: Record<string, AuditSeverity> = {
  ALTA: "HIGH",
  ALTO: "HIGH",
  MEDIA: "MEDIUM",
  MEDIO: "MEDIUM",
  MODERADA: "MEDIUM",
  BAIXA: "LOW",
  BAIXO: "LOW",
};

const KIND_ALIASES: Record<string, AnalysisStatementKind> = {
  FATO: "FACT",
  INFERENCIA: "INFERENCE",
  HIPOTESE: "INFERENCE",
  DESCONHECIDO: "UNKNOWN",
  LACUNA: "UNKNOWN",
};

const sectionField = z.preprocess((value) => {
  const key = normalizeEnum(value);
  return typeof key === "string" ? (SECTION_ALIASES[key] ?? key) : key;
}, z.enum(AUDIT_SECTIONS));

const areaField = z.preprocess((value) => {
  const key = normalizeEnum(value);
  return typeof key === "string" ? (AREA_ALIASES[key] ?? key) : key;
}, z.enum(AUDIT_PROBLEM_AREAS));

const severityField = z.preprocess((value) => {
  const key = normalizeEnum(value);
  return typeof key === "string" ? (SEVERITY_ALIASES[key] ?? key) : key;
}, z.enum(AUDIT_SEVERITIES));

const kindField = z.preprocess((value) => {
  const key = normalizeEnum(value);
  return typeof key === "string" ? (KIND_ALIASES[key] ?? key) : key;
}, z.enum(ANALYSIS_STATEMENT_KINDS));

export const auditProblemSchema = z.object({
  area: areaField,
  severity: severityField,
  problem: statement,
  source: z.string().trim().max(60).optional(),
});

export const auditSectionSchema = z.object({
  section: sectionField,
  justification: statement,
});

export const auditEvidenceSchema = z.object({
  kind: kindField,
  statement,
  source: z.string().trim().max(60).optional(),
});

function toArray(value: unknown, max: number): unknown {
  const items = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return items.slice(0, max);
}

/** Model-facing contract: the LLM never returns scores. */
export const digitalAuditResponseSchema = z.object({
  auditSummary: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().slice(0, AUDIT_LIMITS.maxSummaryChars) : value,
    z.string().min(10).max(AUDIT_LIMITS.maxSummaryChars),
  ),
  conversionProblems: z.preprocess(
    (value) => toArray(value, AUDIT_LIMITS.maxProblems),
    z.array(auditProblemSchema).min(1).max(AUDIT_LIMITS.maxProblems),
  ),
  recommendedSections: z.preprocess(
    (value) => toArray(value, AUDIT_LIMITS.maxSections),
    z.array(auditSectionSchema).min(1).max(AUDIT_LIMITS.maxSections),
  ),
  evidence: z.preprocess(
    (value) => toArray(value, AUDIT_LIMITS.maxEvidence),
    z.array(auditEvidenceSchema).min(1).max(AUDIT_LIMITS.maxEvidence),
  ),
});

export type DigitalAuditResponse = z.infer<typeof digitalAuditResponseSchema>;
