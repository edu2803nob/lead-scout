import { BUSINESS_PROFILE_CONFIG, type BusinessProfile } from "@/config/commercial-analysis";
import {
  OUTREACH_LIMITS,
  OUTREACH_STYLE_GUIDES,
  OUTREACH_STYLE_LABELS,
  type OutreachStyle,
} from "@/config/outreach";
import type { StoredCommercialAnalysis } from "@/types/analysis";
import type { StoredDigitalAudit } from "@/types/audit";
import type { Lead } from "@/types/lead";
import type { StoredOfferRecommendation } from "@/types/offer";

/**
 * Minimal payload + instructions for the outreach generator.
 *
 * The context is limited to what was really observed (lead fields plus the
 * stored audit / analysis / offer). Those records are read-only here.
 */

export interface OutreachContext {
  lead: Lead;
  audit?: StoredDigitalAudit | null | undefined;
  analysis?: StoredCommercialAnalysis | null | undefined;
  offer?: StoredOfferRecommendation | null | undefined;
}

export function buildOutreachPayload(context: OutreachContext): Record<string, unknown> {
  const { lead, audit, analysis, offer } = context;

  return {
    empresa: lead.companyName,
    categoria: lead.businessCategory,
    subcategoria: lead.businessSubcategory,
    cidade: lead.city,
    possuiWebsite: lead.hasWebsite,
    qualidadeDoWebsite: lead.websiteQuality,
    possuiInstagram: Boolean(lead.instagramUrl ?? lead.instagramUsername),
    seguidoresInstagram: lead.instagramFollowers,
    possuiWhatsapp: lead.hasWhatsapp,
    avaliacaoGoogle: lead.googleRating,
    numeroDeAvaliacoesGoogle: lead.googleReviewCount,
    observacoesDaAuditoria: (audit?.conversionProblems ?? [])
      .slice(0, OUTREACH_LIMITS.maxContextItems)
      .map((item) => item.problem),
    resumoDaAuditoria: audit?.auditSummary ?? null,
    resumoDaAnalise: analysis?.summary ?? null,
    oportunidades: (analysis?.opportunities ?? []).slice(0, OUTREACH_LIMITS.maxContextItems),
    ofertaRecomendada: offer?.offerTitle ?? analysis?.recommendedOffer ?? null,
    objetivoDaOferta: offer?.mainObjective ?? null,
  };
}

export function buildOutreachInstructions(
  profile: BusinessProfile,
  styles: readonly OutreachStyle[],
): string {
  const config = BUSINESS_PROFILE_CONFIG[profile];
  const styleLines = styles.map(
    (style) => `- ${style} (${OUTREACH_STYLE_LABELS[style]}): ${OUTREACH_STYLE_GUIDES[style]}`,
  );

  return [
    "Você escreve sugestões de primeira abordagem comercial para negócios locais no Brasil.",
    "A mensagem é apenas uma SUGESTÃO para revisão humana: ela nunca será enviada automaticamente.",
    "Use APENAS os DADOS fornecidos. É proibido inventar informações, métricas, nomes, prazos, preços ou resultados.",
    "Se um dado não está nos DADOS, simplesmente não fale sobre ele.",
    `Segmento identificado: ${config.label}. Alavancas relevantes: ${config.focus.join(", ")}.`,
    `Gere exatamente uma mensagem para cada estilo solicitado: ${styles.join(", ")}.`,
    ...styleLines,
    "Cada `message` deve, obrigatoriamente:",
    `- ser curta (no máximo ${OUTREACH_LIMITS.maxMessageChars} caracteres, em 2 a 4 frases);`,
    "- ser específica, profissional e contextual, citando a empresa;",
    "- trazer UMA observação real retirada dos DADOS;",
    "- apresentar UMA oportunidade concreta ligada a essa observação;",
    "- terminar com uma pergunta simples e fácil de responder;",
    "- não prometer resultados, números, ganhos ou garantias;",
    "- não usar linguagem de spam, urgência artificial, caixa alta ou emojis em excesso.",
    "`reason`: em uma frase, por que essa abordagem faz sentido para este lead, citando o dado observado.",
    "Escreva em português do Brasil, em texto simples, sem markdown e sem assinatura inventada.",
    "Responda EXATAMENTE neste formato JSON:",
    '{"messages": [{"style": "CONSULTIVE", "message": "...", "reason": "..."}]}',
  ].join("\n");
}
