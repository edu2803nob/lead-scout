import {
  CATEGORY_OPPORTUNITY_HINTS,
  OPPORTUNITY_BANDS,
  OPPORTUNITY_BOUNDS,
  OPPORTUNITY_CHANNEL_POINTS,
  OPPORTUNITY_DEMAND_CONFIG,
  OPPORTUNITY_FIT_CONFIG,
  OPPORTUNITY_GAP_POINTS,
  OPPORTUNITY_MODEL_FIT,
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_TYPE_MIN_SCORE,
  OPPORTUNITY_WEIGHTS,
  type OpportunityType,
} from "@/config/opportunity";
import { SOCIAL_ACTIVITY_DAYS } from "@/config/scoring";
import type { SocialActivity } from "@/types/enrichment";
import type {
  LandingPageOpportunityResult,
  OpportunityEvidence,
  OpportunityLead,
  OpportunityTypeResult,
} from "@/types/opportunity";

/**
 * Landing Page Opportunity engine — deterministic and pure.
 *
 * It answers a different question than the Lead Score: not "is this business
 * commercially interesting?" but "how adequate is a landing page as a solution
 * for this business?". The Lead Score engine is untouched by this module.
 *
 * Hard rules:
 * - a need is NEVER assumed from the category alone: every emitted type must be
 *   backed by at least one observed piece of evidence;
 * - missing information stays missing (no invented data).
 */

const DAY_MS = 86_400_000;

function clamp(value: number): number {
  return Math.min(OPPORTUNITY_BOUNDS.max, Math.max(OPPORTUNITY_BOUNDS.min, value));
}

function round(value: number): number {
  return Math.round(value);
}

/** Logarithmic (progressive) curve: big numbers never dominate linearly. */
export function progressive(value: number, saturation: number, maxPoints: number): number {
  if (value <= 0) return 0;
  const ratio = Math.log10(1 + Math.min(value, saturation)) / Math.log10(1 + saturation);
  return Math.min(maxPoints, ratio * maxPoints);
}

export function resolveActivity(lead: OpportunityLead, now: Date): SocialActivity {
  if (lead.socialActivity) return lead.socialActivity;
  if (!lead.instagramLastPostAt) return "UNKNOWN";
  const timestamp = Date.parse(lead.instagramLastPostAt);
  if (Number.isNaN(timestamp)) return "UNKNOWN";
  const days = Math.floor((now.getTime() - timestamp) / DAY_MS);
  if (days < 0) return "UNKNOWN";
  if (days <= SOCIAL_ACTIVITY_DAYS.veryActive) return "VERY_ACTIVE";
  if (days <= SOCIAL_ACTIVITY_DAYS.active) return "ACTIVE";
  if (days <= SOCIAL_ACTIVITY_DAYS.moderate) return "MODERATE";
  return "INACTIVE";
}

export function classifyOpportunity(score: number): LandingPageOpportunityResult["level"] {
  const value = round(score);
  const band = OPPORTUNITY_BANDS.find((entry) => value >= entry.min);
  return (band?.level ?? "LOW") as LandingPageOpportunityResult["level"];
}

function hasSocialProfile(lead: OpportunityLead): boolean {
  return Boolean(lead.instagramUrl || lead.instagramUsername);
}

function normalize(value: string | null): string {
  return (value ?? "").toLowerCase();
}

/** Category hints matched against the catalog labels/slugs of the lead. */
export function matchCategoryHints(lead: OpportunityLead) {
  const haystack = `${normalize(lead.businessCategory)} ${normalize(lead.businessSubcategory)}`;
  if (!haystack.trim()) return [];
  return CATEGORY_OPPORTUNITY_HINTS.filter((hint) =>
    hint.keywords.some((keyword) => haystack.includes(keyword)),
  );
}

export function calculateLandingPageOpportunity(
  lead: OpportunityLead,
  now: Date = new Date(),
): LandingPageOpportunityResult {
  const evidence: OpportunityEvidence[] = [];
  const push = (item: OpportunityEvidence) => evidence.push(item);
  const activity = resolveActivity(lead, now);
  const active = activity === "VERY_ACTIVE" || activity === "ACTIVE";
  const socialProfile = hasSocialProfile(lead);

  // ---------------------------------------------------------------- GAP
  const quality = lead.hasWebsite ? lead.websiteQuality : "NO_WEBSITE";
  let gap = OPPORTUNITY_GAP_POINTS.websiteQuality[quality];

  if (quality === "NO_WEBSITE") {
    push({
      code: "NO_WEBSITE",
      source: "WEBSITE",
      label: "Nenhum site identificado",
      detail: "A empresa não possui site próprio: uma landing page cria a base digital.",
    });
    if (active) {
      gap = clamp(gap + OPPORTUNITY_GAP_POINTS.noWebsiteButActiveSocialBonus);
    }
  } else if (quality === "WEAK") {
    push({
      code: "WEAK_WEBSITE",
      source: "WEBSITE",
      label: "Site existente com qualidade fraca",
      detail: "O site atual foi avaliado como fraco e tende a perder visitantes.",
    });
  } else if (quality === "AVERAGE") {
    push({
      code: "AVERAGE_WEBSITE",
      source: "WEBSITE",
      label: "Site mediano",
      detail: "O site funciona, mas não está estruturado para converter.",
    });
  } else if (quality === "UNKNOWN") {
    push({
      code: "WEBSITE_UNVERIFIED",
      source: "WEBSITE",
      label: "Site não verificado",
      detail: "Há site cadastrado, porém ainda não analisado. Avaliação neutra.",
    });
  } else {
    push({
      code: "STRONG_WEBSITE",
      source: "WEBSITE",
      label: "Site já bem resolvido",
      detail: "O site atual atende bem; o ganho de uma landing page é menor.",
    });
  }

  // ------------------------------------------------------------- DEMAND
  const D = OPPORTUNITY_DEMAND_CONFIG;
  let demand = 0;
  let hasDemandEvidence = false;

  if (typeof lead.googleReviewCount === "number" && lead.googleReviewCount > 0) {
    hasDemandEvidence = true;
    demand += progressive(lead.googleReviewCount, D.reviewsSaturation, D.reviewsMaxPoints);
    push({
      code: "GOOGLE_REVIEWS",
      source: "GOOGLE",
      label: `${lead.googleReviewCount} avaliações no Google`,
      detail: "Volume de avaliações indica fluxo real de clientes buscando o negócio.",
    });
  }

  if (typeof lead.googleRating === "number" && lead.googleRating >= D.ratingFloor) {
    hasDemandEvidence = true;
    demand += D.ratingPoints;
    push({
      code: "GOOGLE_RATING",
      source: "GOOGLE",
      label: `Nota ${lead.googleRating} no Google`,
      detail: "Boa reputação é argumento de prova social para a landing page.",
    });
  }

  if (typeof lead.instagramFollowers === "number" && lead.instagramFollowers > 0) {
    hasDemandEvidence = true;
    demand += progressive(lead.instagramFollowers, D.followersSaturation, D.followersMaxPoints);
    push({
      code: "SOCIAL_AUDIENCE",
      source: "SOCIAL",
      label: `${lead.instagramFollowers} seguidores`,
      detail: "Audiência social já existente pode ser direcionada para uma página de conversão.",
    });
  }

  if (socialProfile && active) {
    push({
      code: "SOCIAL_ACTIVE",
      source: "SOCIAL",
      label: "Perfil social ativo",
      detail: "O perfil publica com frequência, gerando tráfego sem destino de conversão.",
    });
  } else if (socialProfile && activity === "INACTIVE") {
    push({
      code: "SOCIAL_INACTIVE",
      source: "SOCIAL",
      label: "Perfil social parado",
      detail: "Perfil existe, mas sem publicações recentes: demanda social não comprovada.",
    });
  }

  const demandScore = hasDemandEvidence ? clamp(demand) : D.unknownScore;

  // ---------------------------------------------------------------- FIT
  let fit = lead.businessModel
    ? (OPPORTUNITY_MODEL_FIT[lead.businessModel] ?? OPPORTUNITY_FIT_CONFIG.unknownModelScore)
    : OPPORTUNITY_FIT_CONFIG.unknownModelScore;

  if (lead.businessModel && OPPORTUNITY_MODEL_FIT[lead.businessModel] !== undefined) {
    push({
      code: "BUSINESS_MODEL",
      source: "BUSINESS_MODEL",
      label: `Modelo de negócio: ${lead.businessModel}`,
      detail: "Modelo comercial observado define o tipo de página mais adequado.",
    });
  }

  const hints = matchCategoryHints(lead);
  if (hints.length > 0) {
    fit = clamp(fit + OPPORTUNITY_FIT_CONFIG.categoryProfileBonus);
    push({
      code: "CATEGORY_PROFILE",
      source: "CATEGORY",
      label: hints[0]!.label,
      detail: "Perfil de categoria usado apenas como hipótese, confirmado pelas evidências acima.",
    });
  }

  // ------------------------------------------------------------ CHANNEL
  const C = OPPORTUNITY_CHANNEL_POINTS;
  let channel = 0;

  if (lead.hasWhatsapp) {
    channel += C.whatsapp;
    push({
      code: "WHATSAPP",
      source: "CONTACT",
      label: "WhatsApp disponível",
      detail: "Canal direto publicado: a landing page pode converter direto em conversa.",
    });
  }
  if (lead.phone?.trim()) {
    channel += C.phone;
    push({
      code: "PHONE",
      source: "CONTACT",
      label: "Telefone disponível",
      detail: "Contato telefônico permite CTA de ligação.",
    });
  }
  if (lead.email?.trim()) {
    channel += C.email;
    push({
      code: "EMAIL",
      source: "CONTACT",
      label: "E-mail disponível",
      detail: "E-mail permite fluxo de formulário e follow-up.",
    });
  }
  if (socialProfile) {
    channel += C.socialProfile;
    push({
      code: "SOCIAL_PROFILE",
      source: "SOCIAL",
      label: "Perfil social identificado",
      detail: "O perfil pode enviar tráfego para a landing page (link na bio).",
    });
  }

  let channelScore = channel;
  if (channel === 0) {
    channelScore = C.noChannelScore;
    push({
      code: "NO_CHANNEL",
      source: "CONTACT",
      label: "Nenhum canal de contato identificado",
      detail: "Sem canal público, a landing page precisa criar o ponto de conversão.",
    });
  }

  const gapScore = clamp(gap);
  const fitScore = clamp(fit);
  channelScore = clamp(channelScore);

  const W = OPPORTUNITY_WEIGHTS;
  const opportunityScore = clamp(
    round(
      gapScore * W.gap + demandScore * W.demand + fitScore * W.fit + channelScore * W.channel,
    ),
  );

  const opportunityTypes = deriveTypes({
    lead,
    quality,
    gapScore,
    demandScore,
    fitScore,
    channelScore,
    hasDemandEvidence,
    socialProfile,
    active,
    hints,
  });

  return {
    opportunityScore,
    level: classifyOpportunity(opportunityScore),
    gapScore: round(gapScore),
    demandScore: round(demandScore),
    fitScore: round(fitScore),
    channelScore: round(channelScore),
    opportunityTypes,
    evidence,
    recommendedSolution: buildRecommendation(opportunityScore, opportunityTypes, lead),
  };
}

interface TypeContext {
  lead: OpportunityLead;
  quality: OpportunityLead["websiteQuality"];
  gapScore: number;
  demandScore: number;
  fitScore: number;
  channelScore: number;
  hasDemandEvidence: boolean;
  socialProfile: boolean;
  active: boolean;
  hints: ReturnType<typeof matchCategoryHints>;
}

/**
 * Types are only emitted when evidence supports them. Category hints raise the
 * score of a type that already has evidence — they never create one alone.
 */
function deriveTypes(ctx: TypeContext): OpportunityTypeResult[] {
  const { lead, quality, gapScore, demandScore, fitScore, channelScore } = ctx;
  const candidates = new Map<OpportunityType, OpportunityTypeResult>();
  const hintTypes = new Set<OpportunityType>(ctx.hints.flatMap((hint) => hint.types));

  const offer = (type: OpportunityType, base: number, reason: string) => {
    const boosted = hintTypes.has(type) ? base + OPPORTUNITY_FIT_CONFIG.categoryProfileBonus : base;
    const score = clamp(round(boosted));
    if (score < OPPORTUNITY_TYPE_MIN_SCORE) return;
    const current = candidates.get(type);
    if (!current || current.score < score) candidates.set(type, { type, score, reason });
  };

  if (quality === "NO_WEBSITE") {
    offer("NO_WEBSITE", gapScore, "A empresa não tem site: qualquer presença própria é ganho.");
    offer(
      "DIGITAL_PRESENCE",
      (gapScore + demandScore) / 2,
      "Existe negócio ativo sem base digital própria.",
    );
  }

  if (quality === "WEAK" || quality === "AVERAGE") {
    offer(
      "WEAK_WEBSITE",
      gapScore,
      "O site atual foi avaliado abaixo do necessário para converter.",
    );
  }

  if (ctx.hasDemandEvidence && gapScore >= 50) {
    offer(
      "CONVERSION",
      (demandScore + gapScore) / 2,
      "Há demanda comprovada, mas nenhum caminho estruturado de conversão.",
    );
  }

  if (channelScore >= 40 && gapScore >= 50) {
    offer(
      "LEAD_GENERATION",
      (channelScore + gapScore) / 2,
      "Existem canais de contato ativos que podem receber leads de uma página.",
    );
  }

  const model = lead.businessModel;
  if (model === "APPOINTMENT" || (hintTypes.has("APPOINTMENT") && ctx.channelScore >= 40)) {
    offer(
      "APPOINTMENT",
      (fitScore + channelScore) / 2,
      "O negócio opera por agenda e possui canal para receber agendamentos.",
    );
  }
  if (model === "QUOTE" || (hintTypes.has("QUOTE") && ctx.channelScore >= 40)) {
    offer(
      "QUOTE",
      (fitScore + channelScore) / 2,
      "O negócio vende por orçamento: formulário e portfólio encurtam o ciclo.",
    );
  }
  if (
    model === "PRODUCT" ||
    model === "ONLINE_SALE" ||
    model === "LOCAL_SALE" ||
    model === "PRODUCT_AND_SERVICE" ||
    (hintTypes.has("CATALOG") && (ctx.socialProfile || ctx.hasDemandEvidence))
  ) {
    offer(
      "CATALOG",
      (fitScore + demandScore) / 2,
      "O negócio vende itens que precisam de vitrine organizada.",
    );
  }
  if (model === "LEAD_GENERATION") {
    offer("LEAD_GENERATION", fitScore, "O modelo do negócio é captação direta de leads.");
  }

  if (ctx.socialProfile && ctx.active && gapScore >= 50) {
    offer(
      "DIGITAL_PRESENCE",
      (gapScore + demandScore) / 2,
      "Perfil social ativo gera tráfego sem página de destino adequada.",
    );
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score);
}

function buildRecommendation(
  score: number,
  types: OpportunityTypeResult[],
  lead: OpportunityLead,
): string {
  if (types.length === 0) {
    return "Sem evidências suficientes para recomendar uma landing page. Enriqueça o lead antes de abordar.";
  }

  const labels = types.slice(0, 3).map((item) => OPPORTUNITY_TYPE_LABELS[item.type]);
  const channel = lead.hasWhatsapp ? "WhatsApp" : lead.phone ? "telefone" : "formulário";
  const level = classifyOpportunity(score);

  const intensity =
    level === "VERY_HIGH"
      ? "Oportunidade muito alta"
      : level === "HIGH"
        ? "Oportunidade alta"
        : level === "MEDIUM"
          ? "Oportunidade moderada"
          : "Oportunidade baixa";

  return `${intensity}: landing page focada em ${labels.join(", ").toLowerCase()}, com CTA principal via ${channel}.`;
}
