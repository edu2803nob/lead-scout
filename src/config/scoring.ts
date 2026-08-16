/**
 * Single source of truth for the Lead Score engine.
 *
 * Every number used by the scoring engine lives here — no magic numbers spread
 * across services, components or tests. Weights and thresholds can be tuned
 * without touching the algorithm.
 */

export const SCORE_DIMENSIONS = [
  "DIGITAL_PRESENCE",
  "AUDIENCE",
  "REPUTATION",
  "COMMERCIAL_POTENTIAL",
  "CONVERSION_OPPORTUNITY",
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export const SCORE_DIMENSION_LABELS: Record<ScoreDimension, string> = {
  DIGITAL_PRESENCE: "Presença digital",
  AUDIENCE: "Audiência",
  REPUTATION: "Reputação",
  COMMERCIAL_POTENTIAL: "Potencial comercial",
  CONVERSION_OPPORTUNITY: "Oportunidade de conversão",
};

/**
 * Configurable weights (must sum to 1).
 * Audience is intentionally the smallest weight: follower count alone must
 * never dominate the final score.
 */
export const SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  DIGITAL_PRESENCE: 0.2,
  AUDIENCE: 0.12,
  REPUTATION: 0.2,
  COMMERCIAL_POTENTIAL: 0.18,
  CONVERSION_OPPORTUNITY: 0.3,
};

/** Classification bands (inclusive lower bound). */
export const SCORE_CLASSIFICATION_BANDS = [
  { classification: "VERY_HIGH", min: 80 },
  { classification: "HIGH", min: 60 },
  { classification: "MEDIUM", min: 40 },
  { classification: "LOW", min: 0 },
] as const;

export const SCORE_BOUNDS = { min: 0, max: 100 } as const;

/** Digital presence: points awarded per observed signal (capped at max). */
export const DIGITAL_PRESENCE_POINTS = {
  websiteReachable: 22,
  websiteSecure: 8,
  websiteResponsiveOrRichContent: 8,
  socialProfile: 22,
  socialActive: 14,
  whatsapp: 10,
  googleListing: 12,
  phoneOrEmail: 8,
  unknownBaseline: 20,
} as const;

/** Audience: progressive (logarithmic) follower curve + activity modulation. */
export const AUDIENCE_CONFIG = {
  /** Follower count that reaches the top of the curve. */
  followersSaturation: 50_000,
  /** Maximum points the follower curve alone can contribute. */
  followersMaxPoints: 70,
  /** Post volume contribution. */
  postsSaturation: 400,
  postsMaxPoints: 15,
  /** Activity multiplier applied to the audience dimension. */
  activityMultiplier: {
    VERY_ACTIVE: 1,
    ACTIVE: 0.9,
    MODERATE: 0.7,
    INACTIVE: 0.4,
    UNKNOWN: 0.6,
  },
  /** Ceiling when the audience is large but the profile is not active. */
  inactiveCeiling: 55,
  /** Points for having an identified profile at all. */
  profileIdentifiedPoints: 15,
} as const;

/** Reputation: Google rating and review volume. */
export const REPUTATION_CONFIG = {
  /** Score used when there is no rating at all (neutral, not punitive). */
  unknownScore: 35,
  ratingMaxPoints: 60,
  /** Ratings below this contribute nothing to the rating component. */
  ratingFloor: 2.5,
  ratingCeiling: 5,
  reviewsSaturation: 500,
  reviewsMaxPoints: 40,
} as const;

/**
 * Commercial potential: how much a landing page / digital funnel can move the
 * needle for this business model, plus contactability.
 */
export const BUSINESS_MODEL_POTENTIAL: Record<string, number> = {
  LEAD_GENERATION: 100,
  QUOTE: 95,
  APPOINTMENT: 90,
  SUBSCRIPTION: 85,
  ONLINE_SALE: 80,
  DELIVERY: 75,
  PRODUCT_AND_SERVICE: 70,
  SERVICE: 70,
  PRODUCT: 60,
  LOCAL_SALE: 55,
};

export const COMMERCIAL_POTENTIAL_CONFIG = {
  /** Used when the business model is unknown. */
  unknownModelScore: 55,
  /** Weight split inside the dimension (must sum to 1). */
  modelWeight: 0.6,
  contactabilityWeight: 0.25,
  categoryWeight: 0.15,
  contactPoints: { phone: 40, email: 30, whatsapp: 30 },
} as const;

/** Conversion opportunity: the gap between current presence and potential. */
export const CONVERSION_OPPORTUNITY_CONFIG = {
  websiteQualityScore: {
    NO_WEBSITE: 100,
    WEAK: 75,
    AVERAGE: 55,
    GOOD: 30,
    EXCELLENT: 15,
    UNKNOWN: 60,
  },
  /** Bonus when there is demand evidence (reviews/audience) but weak presence. */
  demandEvidenceBonus: 10,
  demandEvidenceReviews: 20,
  demandEvidenceFollowers: 1_000,
  /** Penalty when the company has no reachable channel to convert into. */
  noContactChannelPenalty: 10,
  /** Bonus when the social profile is active but there is no/weak website. */
  activeSocialWithoutSiteBonus: 8,
} as const;

/** Number of days used to derive social activity from the last post. */
export const SOCIAL_ACTIVITY_DAYS = {
  veryActive: 7,
  active: 30,
  moderate: 90,
} as const;
