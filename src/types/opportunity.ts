import type { OpportunityType } from "@/config/opportunity";
import type { SocialActivity, WebsiteQuality } from "@/types/enrichment";

/**
 * Domain types for the Landing Page Opportunity engine.
 * Pure domain: no infrastructure imports, no LLM involvement.
 */

export type OpportunityEvidenceSource =
  | "WEBSITE"
  | "GOOGLE"
  | "SOCIAL"
  | "CONTACT"
  | "BUSINESS_MODEL"
  | "CATEGORY";

/** A single observed fact that justifies the score and the emitted types. */
export interface OpportunityEvidence {
  code: string;
  source: OpportunityEvidenceSource;
  label: string;
  detail: string;
}

export interface OpportunityTypeResult {
  type: OpportunityType;
  score: number;
  reason: string;
}

export interface LandingPageOpportunityResult {
  opportunityScore: number;
  level: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
  gapScore: number;
  demandScore: number;
  fitScore: number;
  channelScore: number;
  opportunityTypes: OpportunityTypeResult[];
  evidence: OpportunityEvidence[];
  recommendedSolution: string;
}

/**
 * Read-only projection consumed by `calculateLandingPageOpportunity`.
 * The engine never mutates it and never performs IO.
 */
export interface OpportunityLead {
  readonly hasWebsite: boolean;
  readonly websiteUrl: string | null;
  readonly websiteQuality: WebsiteQuality;
  readonly phone: string | null;
  readonly email: string | null;
  readonly hasWhatsapp: boolean;
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
  readonly socialActivity?: SocialActivity | null;
}
