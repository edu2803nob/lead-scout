import { BUSINESS_PROFILE_CONFIG, type BusinessProfile } from "@/config/commercial-analysis";
import {
  AUDIT_LIMITS,
  AUDIT_PROFILE_SECTIONS,
  AUDIT_SECTION_LABELS,
} from "@/config/digital-audit";
import type { Lead } from "@/types/lead";
import type { LandingPageOpportunityResult } from "@/types/opportunity";
import type { LeadScoreResult } from "@/types/scoring";

/**
 * Minimal payload + segment-aware instructions for the Digital Audit.
 * Only the fields the audit needs are sent — no ids, e-mails or phone numbers.
 */

export interface AuditContext {
  lead: Lead;
  score: LeadScoreResult;
  opportunity: LandingPageOpportunityResult;
}

export function buildAuditPayload(context: AuditContext): Record<string, unknown> {
  const { lead, score, opportunity } = context;

  return {
    empresa: lead.companyName,
    categoria: lead.businessCategory,
    subcategoria: lead.businessSubcategory,
    descricao: lead.description,
    modeloDeNegocio: lead.businessModel,
    cidade: lead.city,
    estado: lead.state,
    possuiWebsite: lead.hasWebsite,
    website: lead.hasWebsite ? (lead.websiteUrl ?? "informado sem URL") : null,
    qualidadeDoWebsite: lead.websiteQuality,
    instagram: lead.instagramUsername ?? lead.instagramUrl,
    seguidoresInstagram: lead.instagramFollowers,
    publicacoesInstagram: lead.instagramPostCount,
    ultimaPublicacaoInstagram: lead.instagramLastPostAt,
    possuiWhatsapp: lead.hasWhatsapp,
    possuiTelefone: Boolean(lead.phone),
    possuiEmail: Boolean(lead.email),
    possuiEndereco: Boolean(lead.address),
    avaliacaoGoogle: lead.googleRating,
    numeroDeAvaliacoesGoogle: lead.googleReviewCount,
    presencaDigital: score.digitalPresenceScore,
    oportunidadeDeConversao: score.conversionOpportunityScore,
    landingPageOpportunity: opportunity.opportunityScore,
    tiposDeOportunidade: opportunity.opportunityTypes.map((item) => item.type),
    evidenciasObservadas: opportunity.evidence
      .slice(0, AUDIT_LIMITS.maxContextEvidence)
      .map((item) => `${item.label}: ${item.detail}`),
  };
}

export function buildAuditInstructions(profile: BusinessProfile): string {
  const config = BUSINESS_PROFILE_CONFIG[profile];
  const sections = AUDIT_PROFILE_SECTIONS[profile];
  const catalogue = sections
    .map((section) => `${section} (${AUDIT_SECTION_LABELS[section]})`)
    .join(", ");

  return [
    "Você é especialista em auditoria de presença digital e conversão de negócios locais no Brasil.",
    "Analise APENAS os dados de DADOS. É proibido inventar problemas, estimar métricas ou supor informações ausentes.",
    `Segmento identificado: ${config.label}. Alavancas de conversão do segmento: ${config.focus.join(", ")}.`,
    "Audite: website, qualidade do website, Instagram, atividade, Google, facilidade de contato, CTA, modelo de negócio, catálogo, agendamento e orçamento.",
    "Quando um item não puder ser avaliado com os DADOS, registre-o como evidência UNKNOWN — nunca como problema.",
    "`conversionProblems`: apenas problemas sustentados por dados observados. Cada item tem `area`, `severity` (HIGH/MEDIUM/LOW), `problem` e, quando possível, `source`.",
    `Áreas válidas: WEBSITE, WEBSITE_QUALITY, CONTACT, CTA, CATALOG, SCHEDULING, QUOTE, SOCIAL, REPUTATION, DIGITAL_PRESENCE.`,
    `\`recommendedSections\`: escolha SOMENTE entre estas seções do segmento: ${catalogue}.`,
    "NÃO recomende todas as seções: recomende apenas as que têm justificativa nos dados observados, e escreva a justificativa em `justification`.",
    "`evidence`: classifique cada afirmação como FACT (observado nos DADOS), INFERENCE (hipótese com linguagem de possibilidade) ou UNKNOWN (não determinável). Inclua pelo menos um UNKNOWN quando houver lacuna relevante.",
    "Não recalcule pontuações: os números de presença digital, conversão e landing page são apenas contexto.",
    `Limites obrigatórios: no máximo ${AUDIT_LIMITS.maxProblems} problemas, ${AUDIT_LIMITS.maxSections} seções, ${AUDIT_LIMITS.maxEvidence} evidências, cada texto com no máximo 220 caracteres e \`auditSummary\` com no máximo 600 caracteres.`,
    "Escreva em português do Brasil, objetivo, sem promessas irreais.",
    "Responda EXATAMENTE neste formato JSON:",
    '{"auditSummary": "...", "conversionProblems": [{"area": "WEBSITE", "severity": "HIGH", "problem": "...", "source": "website"}], "recommendedSections": [{"section": "HERO", "justification": "..."}], "evidence": [{"kind": "FACT", "statement": "...", "source": "google"}]}',
  ].join("\n");
}
