import type { ScoreDimension } from "@/config/scoring";
import type { SocialActivity, WebsiteQuality } from "@/types/enrichment";

/**
 * Domain types for the deterministic Lead Score engine.
 * The LLM never computes these values — it may only explain them later.
 */

export const LEAD_SCORE_CLASSIFICATIONS = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"] as const;

export type LeadScoreClassification = (typeof LEAD_SCORE_CLASSIFICATIONS)[number];

export const LEAD_SCORE_CLASSIFICATION_LABELS: Record<LeadScoreClassification, string> = {
  VERY_HIGH: "Muito alto",
  HIGH: "Alto",
  MEDIUM: "Médio",
  LOW: "Baixo",
};

export type ScoreFactorImpact = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

/** Human-readable explanation of one contribution to the score. */
export interface ScoreFactor {
  dimension: ScoreDimension;
  code: string;
  label: string;
  impact: ScoreFactorImpact;
  /** Points contributed inside the dimension (0-100 scale). */
  points: number;
  explanation: string;
}

export interface LeadScoreResult {
  totalScore: number;
  classification: LeadScoreClassification;
  digitalPresenceScore: number;
  audienceScore: number;
  reputationScore: number;
  commercialPotentialScore: number;
  conversionOpportunityScore: number;
  factors: ScoreFactor[];
}

/**
 * Read-only projection consumed by `calculateLeadScore`.
 * The engine never mutates it and never touches infrastructure.
 */
export interface ScorableLead {
  readonly hasWebsite: boolean;
  readonly websiteUrl: string | null;
  readonly websiteQuality: WebsiteQuality;
  readonly phone: string | null;
  readonly email: string | null;
  readonly hasWhatsapp: boolean;
  readonly googlePlaceId: string | null;
  readonly googleRating: number | null;
  readonly googleReviewCount: number | null;
  readonly instagramUrl: string | null;
  readonly instagramUsername: string | null;
  readonly instagramFollowers: number | null;
  readonly instagramPostCount: number | null;
  readonly instagramLastPostAt: string | null;
  readonly businessModel: string | null;
  readonly businessCategory: string | null;
  readonly businessSubcategory: string | null;
  /** Optional pre-computed activity level (from the enrichment module). */
  readonly socialActivity?: SocialActivity | null;
}
