import {
  AUDIENCE_CONFIG,
  BUSINESS_MODEL_POTENTIAL,
  COMMERCIAL_POTENTIAL_CONFIG,
  CONVERSION_OPPORTUNITY_CONFIG,
  DIGITAL_PRESENCE_POINTS,
  REPUTATION_CONFIG,
  SCORE_BOUNDS,
  SCORE_CLASSIFICATION_BANDS,
  SCORE_WEIGHTS,
  SOCIAL_ACTIVITY_DAYS,
  type ScoreDimension,
} from "@/config/scoring";
import type { SocialActivity } from "@/types/enrichment";
import type {
  LeadScoreClassification,
  LeadScoreResult,
  ScorableLead,
  ScoreFactor,
  ScoreFactorImpact,
} from "@/types/scoring";

/**
 * Deterministic Lead Score engine.
 *
 * Rules:
 * - pure function: the lead is never mutated, no IO, no randomness, no clock
 *   dependency other than the explicitly injected `now`;
 * - the LLM never produces these numbers — it may only read them;
 * - every constant lives in `@/config/scoring`;
 * - each dimension is normalised to 0-100 and combined with configurable
 *   weights, so the total can never exceed 100.
 */

const DAY_MS = 86_400_000;

function clamp(value: number, max: number = SCORE_BOUNDS.max): number {
  if (!Number.isFinite(value)) return SCORE_BOUNDS.min;
  return Math.min(max, Math.max(SCORE_BOUNDS.min, value));
}

function round(value: number): number {
  return Math.round(clamp(value));
}

/** Progressive (logarithmic) curve: early growth counts more than volume. */
export function progressiveCurve(value: number, saturation: number, maxPoints: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const ratio = Math.log10(1 + Math.min(value, saturation)) / Math.log10(1 + saturation);
  return clamp(ratio * maxPoints, maxPoints);
}

/** Activity level derived from the last published post (never guessed). */
export function resolveSocialActivity(lead: ScorableLead, now: Date): SocialActivity {
  if (lead.socialActivity && lead.socialActivity !== "UNKNOWN") return lead.socialActivity;

  const timestamp = lead.instagramLastPostAt ? Date.parse(lead.instagramLastPostAt) : Number.NaN;
  if (!Number.isFinite(timestamp)) return "UNKNOWN";

  const days = Math.floor((now.getTime() - timestamp) / DAY_MS);
  if (days < 0) return "UNKNOWN";
  if (days <= SOCIAL_ACTIVITY_DAYS.veryActive) return "VERY_ACTIVE";
  if (days <= SOCIAL_ACTIVITY_DAYS.active) return "ACTIVE";
  if (days <= SOCIAL_ACTIVITY_DAYS.moderate) return "MODERATE";
  return "INACTIVE";
}

export function classifyScore(totalScore: number): LeadScoreClassification {
  const value = round(totalScore);
  const band = SCORE_CLASSIFICATION_BANDS.find((entry) => value >= entry.min);
  return (band?.classification ?? "LOW") as LeadScoreClassification;
}

interface FactorCollector {
  add(
    dimension: ScoreDimension,
    code: string,
    label: string,
    points: number,
    impact: ScoreFactorImpact,
    explanation: string,
  ): void;
}

function collector(): { factors: ScoreFactor[] } & FactorCollector {
  const factors: ScoreFactor[] = [];
  return {
    factors,
    add(dimension, code, label, points, impact, explanation) {
      factors.push({
        dimension,
        code,
        label,
        impact,
        points: Math.round(points * 10) / 10,
        explanation,
      });
    },
  };
}

function hasSocialProfile(lead: ScorableLead): boolean {
  return Boolean(lead.instagramUrl || lead.instagramUsername);
}

/** DIGITAL PRESENCE — how established the business already is online. */
function digitalPresence(lead: ScorableLead, activity: SocialActivity, add: FactorCollector) {
  const P = DIGITAL_PRESENCE_POINTS;
  let score = 0;

  if (lead.hasWebsite && lead.websiteQuality !== "NO_WEBSITE") {
    if (lead.websiteQuality === "UNKNOWN") {
      score += P.unknownBaseline;
      add.add(
        "DIGITAL_PRESENCE",
        "WEBSITE_UNVERIFIED",
        "Site não verificado",
        P.unknownBaseline,
        "NEUTRAL",
        "O lead tem site cadastrado, mas ele ainda não foi analisado.",
      );
    } else {
      score += P.websiteReachable;
      add.add(
        "DIGITAL_PRESENCE",
        "WEBSITE_ONLINE",
        "Site publicado",
        P.websiteReachable,
        "POSITIVE",
        "A empresa mantém um site próprio.",
      );

      if (lead.websiteQuality === "GOOD" || lead.websiteQuality === "EXCELLENT") {
        score += P.websiteSecure + P.websiteResponsiveOrRichContent;
        add.add(
          "DIGITAL_PRESENCE",
          "WEBSITE_QUALITY",
          "Site bem construído",
          P.websiteSecure + P.websiteResponsiveOrRichContent,
          "POSITIVE",
          "O site apresenta boa estrutura técnica e de conteúdo.",
        );
      } else if (lead.websiteQuality === "AVERAGE") {
        score += P.websiteSecure;
        add.add(
          "DIGITAL_PRESENCE",
          "WEBSITE_AVERAGE",
          "Site mediano",
          P.websiteSecure,
          "NEUTRAL",
          "O site funciona, mas há pontos relevantes a melhorar.",
        );
      }
    }
  } else {
    add.add(
      "DIGITAL_PRESENCE",
      "NO_WEBSITE",
      "Sem site",
      0,
      "NEGATIVE",
      "A empresa não possui site, o que reduz a presença digital.",
    );
  }

  if (hasSocialProfile(lead)) {
    score += P.socialProfile;
    add.add(
      "DIGITAL_PRESENCE",
      "SOCIAL_PROFILE",
      "Perfil social identificado",
      P.socialProfile,
      "POSITIVE",
      "Há um perfil social público associado à empresa.",
    );

    if (activity === "VERY_ACTIVE" || activity === "ACTIVE") {
      score += P.socialActive;
      add.add(
        "DIGITAL_PRESENCE",
        "SOCIAL_ACTIVE",
        "Perfil social ativo",
        P.socialActive,
        "POSITIVE",
        "O perfil publica conteúdo com frequência recente.",
      );
    } else if (activity === "INACTIVE") {
      add.add(
        "DIGITAL_PRESENCE",
        "SOCIAL_INACTIVE",
        "Perfil social parado",
        0,
        "NEGATIVE",
        "O perfil existe, mas está sem publicações recentes.",
      );
    }
  }

  if (lead.hasWhatsapp) {
    score += P.whatsapp;
    add.add(
      "DIGITAL_PRESENCE",
      "WHATSAPP",
      "WhatsApp disponível",
      P.whatsapp,
      "POSITIVE",
      "Canal de atendimento direto já em uso.",
    );
  }

  if (lead.googlePlaceId) {
    score += P.googleListing;
    add.add(
      "DIGITAL_PRESENCE",
      "GOOGLE_LISTING",
      "Ficha no Google",
      P.googleListing,
      "POSITIVE",
      "A empresa aparece no Google Maps / Busca.",
    );
  }

  if (lead.phone || lead.email) score += P.phoneOrEmail;

  return clamp(score);
}

/** AUDIENCE — size AND quality of the audience (activity modulated). */
function audience(lead: ScorableLead, activity: SocialActivity, add: FactorCollector) {
  if (!hasSocialProfile(lead) && lead.instagramFollowers === null) {
    add.add(
      "AUDIENCE",
      "NO_AUDIENCE_DATA",
      "Sem dados de audiência",
      0,
      "NEUTRAL",
      "Nenhum perfil social conhecido para medir audiência.",
    );
    return 0;
  }

  const followers = lead.instagramFollowers ?? 0;
  const followerPoints = progressiveCurve(
    followers,
    AUDIENCE_CONFIG.followersSaturation,
    AUDIENCE_CONFIG.followersMaxPoints,
  );
  const postPoints = progressiveCurve(
    lead.instagramPostCount ?? 0,
    AUDIENCE_CONFIG.postsSaturation,
    AUDIENCE_CONFIG.postsMaxPoints,
  );

  const raw = AUDIENCE_CONFIG.profileIdentifiedPoints + followerPoints + postPoints;
  const multiplier = AUDIENCE_CONFIG.activityMultiplier[activity];
  let score = clamp(raw * multiplier);

  // Large audience + low activity must never look like an excellent lead.
  if (activity === "INACTIVE" || activity === "UNKNOWN") {
    score = clamp(score, AUDIENCE_CONFIG.inactiveCeiling);
  }

  if (followers > 0) {
    add.add(
      "AUDIENCE",
      "FOLLOWERS",
      "Seguidores",
      followerPoints,
      "POSITIVE",
      `${followers.toLocaleString("pt-BR")} seguidores, com peso progressivo (crescimento inicial vale mais que volume).`,
    );
  }

  if (activity === "INACTIVE" || activity === "UNKNOWN") {
    add.add(
      "AUDIENCE",
      "AUDIENCE_LIMITED_BY_ACTIVITY",
      "Audiência limitada pela atividade",
      0,
      activity === "INACTIVE" ? "NEGATIVE" : "NEUTRAL",
      activity === "INACTIVE"
        ? "A audiência é descontada porque o perfil está inativo."
        : "Sem dados de atividade recente, a audiência entra com peso reduzido.",
    );
  }

  return score;
}

/** REPUTATION — Google rating plus review volume. */
function reputation(lead: ScorableLead, add: FactorCollector) {
  const rating = lead.googleRating;
  const reviews = lead.googleReviewCount ?? 0;

  if (rating === null && reviews === 0) {
    add.add(
      "REPUTATION",
      "NO_REPUTATION_DATA",
      "Sem avaliações",
      REPUTATION_CONFIG.unknownScore,
      "NEUTRAL",
      "Sem avaliações públicas conhecidas; pontuação neutra.",
    );
    return REPUTATION_CONFIG.unknownScore;
  }

  let ratingPoints = 0;
  if (rating !== null) {
    const span = REPUTATION_CONFIG.ratingCeiling - REPUTATION_CONFIG.ratingFloor;
    const normalized = (rating - REPUTATION_CONFIG.ratingFloor) / span;
    ratingPoints = clamp(
      normalized * REPUTATION_CONFIG.ratingMaxPoints,
      REPUTATION_CONFIG.ratingMaxPoints,
    );
    add.add(
      "REPUTATION",
      "GOOGLE_RATING",
      "Nota no Google",
      ratingPoints,
      rating >= 4 ? "POSITIVE" : rating >= 3 ? "NEUTRAL" : "NEGATIVE",
      `Nota ${rating.toFixed(1)} no Google.`,
    );
  }

  const reviewPoints = progressiveCurve(
    reviews,
    REPUTATION_CONFIG.reviewsSaturation,
    REPUTATION_CONFIG.reviewsMaxPoints,
  );
  if (reviews > 0) {
    add.add(
      "REPUTATION",
      "GOOGLE_REVIEWS",
      "Volume de avaliações",
      reviewPoints,
      "POSITIVE",
      `${reviews.toLocaleString("pt-BR")} avaliações indicam movimento real de clientes.`,
    );
  }

  return clamp(ratingPoints + reviewPoints);
}

/** COMMERCIAL POTENTIAL — landing page potential of the business model. */
function commercialPotential(lead: ScorableLead, add: FactorCollector) {
  const C = COMMERCIAL_POTENTIAL_CONFIG;
  const model = lead.businessModel ? BUSINESS_MODEL_POTENTIAL[lead.businessModel] : undefined;
  const modelScore = model ?? C.unknownModelScore;

  add.add(
    "COMMERCIAL_POTENTIAL",
    model === undefined ? "BUSINESS_MODEL_UNKNOWN" : "BUSINESS_MODEL",
    "Modelo de negócio",
    modelScore * C.modelWeight,
    model === undefined ? "NEUTRAL" : modelScore >= 75 ? "POSITIVE" : "NEUTRAL",
    model === undefined
      ? "Modelo de negócio não informado; potencial estimado de forma neutra."
      : `Modelo "${lead.businessModel}" tem alto aproveitamento de landing page e captação digital.`,
  );

  const contact =
    (lead.phone ? C.contactPoints.phone : 0) +
    (lead.email ? C.contactPoints.email : 0) +
    (lead.hasWhatsapp ? C.contactPoints.whatsapp : 0);
  const contactScore = clamp(contact);

  const categoryScore = lead.businessCategory ? (lead.businessSubcategory ? 100 : 70) : 40;
  if (lead.businessCategory) {
    add.add(
      "COMMERCIAL_POTENTIAL",
      "CATEGORY_DEFINED",
      "Segmento definido",
      categoryScore * C.categoryWeight,
      "POSITIVE",
      "Categoria conhecida permite oferta e abordagem específicas.",
    );
  }

  if (contactScore === 0) {
    add.add(
      "COMMERCIAL_POTENTIAL",
      "NO_CONTACT",
      "Sem canal de contato",
      0,
      "NEGATIVE",
      "Nenhum telefone, e-mail ou WhatsApp registrado para abordagem.",
    );
  }

  return clamp(
    modelScore * C.modelWeight +
      contactScore * C.contactabilityWeight +
      categoryScore * C.categoryWeight,
  );
}

/** CONVERSION OPPORTUNITY — the gap we can sell against. */
function conversionOpportunity(lead: ScorableLead, activity: SocialActivity, add: FactorCollector) {
  const C = CONVERSION_OPPORTUNITY_CONFIG;
  const quality = lead.hasWebsite ? lead.websiteQuality : "NO_WEBSITE";
  const base = C.websiteQualityScore[quality] ?? C.websiteQualityScore.UNKNOWN;
  let score = base;

  add.add(
    "CONVERSION_OPPORTUNITY",
    `WEBSITE_${quality}`,
    quality === "NO_WEBSITE" ? "Sem site" : "Qualidade do site",
    base,
    base >= 70 ? "POSITIVE" : base <= 30 ? "NEGATIVE" : "NEUTRAL",
    quality === "NO_WEBSITE"
      ? "Sem site: oportunidade máxima de criar presença e conversão."
      : quality === "WEAK"
        ? "Site fraco: oportunidade intermediária de reconstrução."
        : quality === "UNKNOWN"
          ? "Site não avaliado: oportunidade estimada de forma conservadora."
          : "Site já resolve boa parte da conversão, reduzindo a oportunidade.",
  );

  const hasDemand =
    (lead.googleReviewCount ?? 0) >= C.demandEvidenceReviews ||
    (lead.instagramFollowers ?? 0) >= C.demandEvidenceFollowers;

  if (hasDemand && base >= C.websiteQualityScore.AVERAGE) {
    score += C.demandEvidenceBonus;
    add.add(
      "CONVERSION_OPPORTUNITY",
      "DEMAND_EVIDENCE",
      "Demanda comprovada",
      C.demandEvidenceBonus,
      "POSITIVE",
      "Já existe público e movimento, mas a estrutura de conversão é limitada.",
    );
  }

  if ((activity === "VERY_ACTIVE" || activity === "ACTIVE") && base >= C.websiteQualityScore.WEAK) {
    score += C.activeSocialWithoutSiteBonus;
    add.add(
      "CONVERSION_OPPORTUNITY",
      "ACTIVE_SOCIAL_WITHOUT_SITE",
      "Social ativo sem destino",
      C.activeSocialWithoutSiteBonus,
      "POSITIVE",
      "A empresa investe em conteúdo, mas não tem página para converter o tráfego.",
    );
  }

  if (!lead.phone && !lead.email && !lead.hasWhatsapp) {
    score -= C.noContactChannelPenalty;
    add.add(
      "CONVERSION_OPPORTUNITY",
      "NO_CHANNEL",
      "Sem canal para converter",
      -C.noContactChannelPenalty,
      "NEGATIVE",
      "Sem contato conhecido, a conversão fica mais difícil.",
    );
  }

  return clamp(score);
}

/**
 * Calculates the deterministic Lead Score.
 * The input lead is treated as read-only and is never modified.
 */
export function calculateLeadScore(lead: ScorableLead, now: Date = new Date()): LeadScoreResult {
  const activity = resolveSocialActivity(lead, now);
  const { factors, ...add } = collector();

  const digitalPresenceScore = round(digitalPresence(lead, activity, add));
  const audienceScore = round(audience(lead, activity, add));
  const reputationScore = round(reputation(lead, add));
  const commercialPotentialScore = round(commercialPotential(lead, add));
  const conversionOpportunityScore = round(conversionOpportunity(lead, activity, add));

  const weighted =
    digitalPresenceScore * SCORE_WEIGHTS.DIGITAL_PRESENCE +
    audienceScore * SCORE_WEIGHTS.AUDIENCE +
    reputationScore * SCORE_WEIGHTS.REPUTATION +
    commercialPotentialScore * SCORE_WEIGHTS.COMMERCIAL_POTENTIAL +
    conversionOpportunityScore * SCORE_WEIGHTS.CONVERSION_OPPORTUNITY;

  const totalScore = round(weighted);

  return {
    totalScore,
    classification: classifyScore(totalScore),
    digitalPresenceScore,
    audienceScore,
    reputationScore,
    commercialPotentialScore,
    conversionOpportunityScore,
    factors,
  };
}
