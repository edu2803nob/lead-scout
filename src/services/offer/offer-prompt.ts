import { BUSINESS_PROFILE_CONFIG, type BusinessProfile } from "@/config/commercial-analysis";
import { AUDIT_PROFILE_SECTIONS, AUDIT_SECTION_LABELS } from "@/config/digital-audit";
import { OFFER_LIMITS, OFFER_PROFILE_TYPES, OFFER_TYPE_LABELS } from "@/config/offer";
import type { StoredCommercialAnalysis } from "@/types/analysis";
import type { StoredDigitalAudit } from "@/types/audit";
import type { Lead } from "@/types/lead";
import type { LandingPageOpportunityResult } from "@/types/opportunity";

/**
 * Minimal payload + segment-aware instructions for the offer recommendation.
 * The commercial problems come from the stored audit / analysis — never invented
 * here, and never modified.
 */

export interface OfferContext {
  lead: Lead;
  opportunity: LandingPageOpportunityResult;
  audit?: StoredDigitalAudit | null | undefined;
  analysis?: StoredCommercialAnalysis | null | undefined;
}

export function buildOfferPayload(context: OfferContext): Record<string, unknown> {
  const { lead, opportunity, audit, analysis } = context;

  return {
    empresa: lead.companyName,
    categoria: lead.businessCategory,
    subcategoria: lead.businessSubcategory,
    modeloDeNegocio: lead.businessModel,
    cidade: lead.city,
    possuiWebsite: lead.hasWebsite,
    qualidadeDoWebsite: lead.websiteQuality,
    possuiInstagram: Boolean(lead.instagramUrl ?? lead.instagramUsername),
    seguidoresInstagram: lead.instagramFollowers,
    possuiWhatsapp: lead.hasWhatsapp,
    avaliacaoGoogle: lead.googleRating,
    numeroDeAvaliacoesGoogle: lead.googleReviewCount,
    landingPageOpportunity: opportunity.opportunityScore,
    tiposDeOportunidade: opportunity.opportunityTypes.map((item) => item.type),
    problemasIdentificados: (audit?.conversionProblems ?? [])
      .slice(0, OFFER_LIMITS.maxContextProblems)
      .map((item) => ({ area: item.area, severity: item.severity, problem: item.problem })),
    resumoDaAuditoria: audit?.auditSummary ?? null,
    resumoDaAnalise: analysis?.summary ?? null,
    doresDaAnalise: (analysis?.painPoints ?? []).slice(0, OFFER_LIMITS.maxContextItems),
    oportunidadesDaAnalise: (analysis?.opportunities ?? []).slice(0, OFFER_LIMITS.maxContextItems),
    ofertaSugeridaNaAnalise: analysis?.recommendedOffer ?? null,
    potencialDeCompra: analysis?.purchasePotential ?? null,
  };
}

export function buildOfferInstructions(profile: BusinessProfile): string {
  const config = BUSINESS_PROFILE_CONFIG[profile];
  const types = OFFER_PROFILE_TYPES[profile]
    .map((type) => `${type} (${OFFER_TYPE_LABELS[type]})`)
    .join(", ");
  const sections = AUDIT_PROFILE_SECTIONS[profile]
    .map((section) => `${section} (${AUDIT_SECTION_LABELS[section]})`)
    .join(", ");

  return [
    "Você é especialista em ofertas de landing page para negócios locais no Brasil.",
    "Use APENAS os DADOS fornecidos (lead, auditoria digital e análise comercial já existentes). É proibido inventar problemas, métricas ou informações ausentes.",
    `Segmento identificado: ${config.label}. Alavancas de conversão: ${config.focus.join(", ")}.`,
    "NÃO ofereça 'um site' genericamente: escolha a solução de landing page que resolve um problema comercial já identificado nos DADOS.",
    `\`offerType\`: escolha SOMENTE entre ${types}. Use \`secondaryOfferType\` apenas quando o segundo tipo for necessário para resolver outro problema identificado; caso contrário omita.`,
    `\`recommendedSections\`: escolha SOMENTE entre estas seções do segmento: ${sections}. Recomende apenas as que têm justificativa nos DADOS, com a justificativa em \`justification\`.`,
    "`linkedProblems`: copie os problemas comerciais dos DADOS (`problemasIdentificados` ou `doresDaAnalise`) que esta oferta resolve. Se não houver nenhum problema nos DADOS, não invente: mantenha a lista fiel ao que foi observado.",
    "`mainObjective`: o objetivo comercial principal da página. `conversionStrategy`: como a página converte, em uma frase objetiva.",
    "`primaryCTA` e `secondaryCTA`: textos curtos de botão (o secundário é opcional). `valueProposition`: proposta de valor concreta, sem promessas irreais nem números inventados.",
    `Limites obrigatórios: no máximo ${OFFER_LIMITS.maxSections} seções, ${OFFER_LIMITS.maxLinkedProblems} problemas vinculados, título com ${OFFER_LIMITS.maxTitleChars} caracteres, CTAs com ${OFFER_LIMITS.maxCtaChars} caracteres e cada texto com no máximo 220 caracteres.`,
    "Escreva em português do Brasil.",
    "Responda EXATAMENTE neste formato JSON:",
    '{"offerType": "LEAD_GENERATION", "secondaryOfferType": "APPOINTMENT", "offerTitle": "...", "mainObjective": "...", "recommendedSections": [{"section": "HERO", "justification": "..."}], "conversionStrategy": "...", "primaryCTA": "...", "secondaryCTA": "...", "valueProposition": "...", "linkedProblems": [{"area": "WEBSITE", "severity": "HIGH", "problem": "..."}]}',
  ].join("\n");
}
