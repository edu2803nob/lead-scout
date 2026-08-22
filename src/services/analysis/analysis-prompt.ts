import {
  ANALYSIS_LIMITS,
  BUSINESS_PROFILE_CONFIG,
  detectBusinessProfile,
  type BusinessProfile,
} from "@/config/commercial-analysis";
import type { Lead } from "@/types/lead";
import type { LandingPageOpportunityResult } from "@/types/opportunity";
import type { LeadScoreResult } from "@/types/scoring";

/**
 * Builds the minimal payload and the segment-aware instructions.
 * Only fields relevant to the commercial analysis are sent — no ids, no e-mails,
 * no phone numbers, no user data.
 */

export interface AnalysisContext {
  lead: Lead;
  score: LeadScoreResult;
  opportunity: LandingPageOpportunityResult;
}

export function buildAnalysisPayload(context: AnalysisContext): Record<string, unknown> {
  const { lead, score, opportunity } = context;

  return {
    empresa: lead.companyName,
    categoria: lead.businessCategory,
    subcategoria: lead.businessSubcategory,
    descricao: lead.description,
    modeloDeNegocio: lead.businessModel,
    cidade: lead.city,
    estado: lead.state,
    website: lead.hasWebsite ? (lead.websiteUrl ?? "informado sem URL") : null,
    possuiWebsite: lead.hasWebsite,
    qualidadeDoWebsite: lead.websiteQuality,
    instagram: lead.instagramUsername ?? lead.instagramUrl,
    seguidoresInstagram: lead.instagramFollowers,
    publicacoesInstagram: lead.instagramPostCount,
    ultimaPublicacaoInstagram: lead.instagramLastPostAt,
    possuiWhatsapp: lead.hasWhatsapp,
    avaliacaoGoogle: lead.googleRating,
    numeroDeAvaliacoesGoogle: lead.googleReviewCount,
    leadScore: {
      total: score.totalScore,
      classificacao: score.classification,
      presencaDigital: score.digitalPresenceScore,
      audiencia: score.audienceScore,
      reputacao: score.reputationScore,
      potencialComercial: score.commercialPotentialScore,
      oportunidadeDeConversao: score.conversionOpportunityScore,
    },
    opportunityScore: {
      total: opportunity.opportunityScore,
      nivel: opportunity.level,
      lacuna: opportunity.gapScore,
      demanda: opportunity.demandScore,
      aderencia: opportunity.fitScore,
      canais: opportunity.channelScore,
      tipos: opportunity.opportunityTypes.map((item) => item.type),
    },
    evidencias: opportunity.evidence
      .slice(0, ANALYSIS_LIMITS.maxContextEvidence)
      .map((item) => `${item.label}: ${item.detail}`),
  };
}

export function buildAnalysisInstructions(profile: BusinessProfile): string {
  const config = BUSINESS_PROFILE_CONFIG[profile];

  return [
    "Você é analista comercial B2B especializado em prospecção de empresas locais no Brasil.",
    "Analise APENAS os dados fornecidos em DADOS. É proibido inventar, estimar ou completar informações ausentes.",
    `Segmento identificado: ${config.label}. Considere especificamente estas alavancas de conversão: ${config.focus.join(", ")}.`,
    "Adapte a análise ao segmento: não produza uma resposta genérica que serviria para qualquer negócio.",
    "Cada item de `evidence` deve ser classificado:",
    '- "FACT": afirmação diretamente observada nos DADOS (ex.: "Não foi encontrado website.").',
    '- "INFERENCE": hipótese plausível derivada dos fatos, sempre com linguagem de possibilidade (ex.: "A empresa pode depender do Instagram para direcionar clientes.").',
    '- "UNKNOWN": informação que os DADOS não permitem determinar (ex.: "Não foi possível determinar a taxa de conversão.").',
    "Inclua pelo menos um item UNKNOWN quando houver lacuna de dados relevante.",
    "Não repita os números de leadScore e opportunityScore como se fossem seus cálculos: use-os como contexto.",
    "`purchasePotential` é 0-100 e `confidence` é 0-1 (baixa confiança quando há poucos dados observados).",
    "Escreva em português do Brasil, objetivo, sem promessas irreais.",
    "Responda no formato: {purchasePotential, confidence, summary, painPoints[], opportunities[], recommendedOffer, recommendedApproach, reasoning[], evidence[{kind, statement, source}]}.",
  ].join("\n");
}

export function profileForLead(lead: Lead): BusinessProfile {
  return detectBusinessProfile({
    businessCategory: lead.businessCategory,
    businessSubcategory: lead.businessSubcategory,
    description: lead.description,
    companyName: lead.companyName,
  });
}
