import type { AuditProblemArea, AuditSection, AuditSeverity } from "@/config/digital-audit";
import type { OfferType } from "@/config/offer";

/**
 * Domain types for the offer recommendation module.
 *
 * Every offer must be linked to at least one commercial problem already
 * identified by the digital audit / commercial analysis — the module never
 * "sells a website" by default.
 */

export interface OfferSection {
  section: AuditSection;
  justification: string;
}

/** The commercial problem that justifies the offer. */
export interface OfferLinkedProblem {
  area: AuditProblemArea;
  severity: AuditSeverity;
  problem: string;
}

export interface OfferRecommendationResult {
  offerType: OfferType;
  /** Complementary type, when the segment needs two (e.g. LEAD_GENERATION + APPOINTMENT). */
  secondaryOfferType?: OfferType | undefined;
  offerTitle: string;
  mainObjective: string;
  recommendedSections: OfferSection[];
  conversionStrategy: string;
  primaryCTA: string;
  secondaryCTA?: string | undefined;
  valueProposition: string;
  linkedProblems: OfferLinkedProblem[];
}

/** Stored recommendation (result + provenance), as returned to the UI. */
export interface StoredOfferRecommendation extends OfferRecommendationResult {
  id: string;
  leadId: string;
  provider: string;
  model: string;
  businessProfile: string | null;
  createdAt: string;
  updatedAt: string;
}
