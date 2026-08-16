import type { Database } from "@/integrations/supabase/types";
import type { Lead } from "@/types/lead";
import type { LandingPageOpportunityResult, OpportunityLead } from "@/types/opportunity";

type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"];

/** Lead -> read-only projection consumed by the engine (never mutated). */
export function toOpportunityLead(lead: Lead): OpportunityLead {
  return {
    hasWebsite: lead.hasWebsite,
    websiteUrl: lead.websiteUrl,
    websiteQuality: lead.websiteQuality,
    phone: lead.phone,
    email: lead.email,
    hasWhatsapp: lead.hasWhatsapp,
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

/** One row per emitted opportunity type, each carrying the shared evidence. */
export function toOpportunityRows(
  result: LandingPageOpportunityResult,
): Array<Omit<OpportunityInsert, "user_id" | "lead_id">> {
  return result.opportunityTypes.map((item) => ({
    type: item.type,
    score: item.score,
    reason: item.reason,
    recommended_solution: result.recommendedSolution,
    evidence: {
      opportunityScore: result.opportunityScore,
      level: result.level,
      gapScore: result.gapScore,
      demandScore: result.demandScore,
      fitScore: result.fitScore,
      channelScore: result.channelScore,
      items: result.evidence,
    } as unknown as OpportunityInsert["evidence"],
  }));
}
