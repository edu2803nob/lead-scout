import type { Database } from "@/integrations/supabase/types";
import type { Lead } from "@/types/lead";
import type { LeadScoreClassification, LeadScoreResult, ScorableLead } from "@/types/scoring";

type ScoreRow = Database["public"]["Tables"]["lead_scores"]["Row"];
type ScoreInsert = Database["public"]["Tables"]["lead_scores"]["Insert"];
type DbClassification = Database["public"]["Enums"]["lead_classification"];

/**
 * The database classification enum predates the score bands, so the mapping is
 * declared once here instead of being duplicated at every call site.
 */
export const CLASSIFICATION_TO_DB: Record<LeadScoreClassification, DbClassification> = {
  VERY_HIGH: "PRIORITY",
  HIGH: "HOT",
  MEDIUM: "WARM",
  LOW: "COLD",
};

export const DB_TO_CLASSIFICATION: Record<DbClassification, LeadScoreClassification> = {
  PRIORITY: "VERY_HIGH",
  HOT: "HIGH",
  WARM: "MEDIUM",
  COLD: "LOW",
  UNKNOWN: "LOW",
};

/** Lead -> read-only projection consumed by the engine (no mutation). */
export function toScorableLead(lead: Lead): ScorableLead {
  return {
    hasWebsite: lead.hasWebsite,
    websiteUrl: lead.websiteUrl,
    websiteQuality: lead.websiteQuality,
    phone: lead.phone,
    email: lead.email,
    hasWhatsapp: lead.hasWhatsapp,
    googlePlaceId: lead.googlePlaceId,
    googleRating: lead.googleRating,
    googleReviewCount: lead.googleReviewCount,
    instagramUrl: lead.instagramUrl,
    instagramUsername: lead.instagramUsername,
    instagramFollowers: lead.instagramFollowers,
    instagramPostCount: lead.instagramPostCount,
    instagramLastPostAt: lead.instagramLastPostAt,
    businessModel: lead.businessModel,
    businessCategory: lead.businessCategory,
    businessSubcategory: lead.businessSubcategory,
  };
}

export function toScoreColumns(result: LeadScoreResult): Omit<ScoreInsert, "user_id" | "lead_id"> {
  return {
    digital_presence_score: result.digitalPresenceScore,
    audience_score: result.audienceScore,
    reputation_score: result.reputationScore,
    commercial_potential_score: result.commercialPotentialScore,
    conversion_opportunity_score: result.conversionOpportunityScore,
    total_score: result.totalScore,
    classification: CLASSIFICATION_TO_DB[result.classification],
  };
}

/** Stored row -> domain result (factors are recomputed, never persisted). */
export function fromScoreRow(row: ScoreRow): Omit<LeadScoreResult, "factors"> {
  return {
    totalScore: row.total_score,
    classification: DB_TO_CLASSIFICATION[row.classification],
    digitalPresenceScore: row.digital_presence_score,
    audienceScore: row.audience_score,
    reputationScore: row.reputation_score,
    commercialPotentialScore: row.commercial_potential_score,
    conversionOpportunityScore: row.conversion_opportunity_score,
  };
}
