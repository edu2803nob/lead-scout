import type { BusinessProfile } from "@/config/commercial-analysis";
import {
  AUDIT_PROBLEM_AREAS,
  AUDIT_PROFILE_SECTIONS,
  AUDIT_SECTIONS,
  AUDIT_SEVERITIES,
  type AuditProblemArea,
  type AuditSection,
  type AuditSeverity,
} from "@/config/digital-audit";
import { OFFER_LIMITS, OFFER_PROFILE_TYPES, OFFER_TYPES, type OfferType } from "@/config/offer";
import type { Database } from "@/integrations/supabase/types";
import type {
  OfferLinkedProblem,
  OfferRecommendationResult,
  OfferSection,
  StoredOfferRecommendation,
} from "@/types/offer";

import type { OfferRecommendationResponse } from "./offer-schema";

type OfferRow = Database["public"]["Tables"]["lead_offers"]["Row"];
type OfferInsert = Database["public"]["Tables"]["lead_offers"]["Insert"];

export interface OfferMappingContext {
  profile: BusinessProfile;
  /** Commercial problems already identified (audit / analysis). Never invented here. */
  observedProblems: OfferLinkedProblem[];
}

/**
 * Turns the model response into the stored result:
 * - offer types outside the segment allowlist are replaced by the segment default;
 * - sections outside the segment allowlist are discarded and de-duplicated;
 * - linked problems are anchored to the problems already observed, so an offer is
 *   never detached from a real commercial problem.
 */
export function toOfferResult(
  response: OfferRecommendationResponse,
  context: OfferMappingContext,
): OfferRecommendationResult {
  const allowedTypes = OFFER_PROFILE_TYPES[context.profile];
  const offerType: OfferType = allowedTypes.includes(response.offerType)
    ? response.offerType
    : (allowedTypes[0] as OfferType);

  const secondary = response.secondaryOfferType;
  const secondaryOfferType =
    secondary && secondary !== offerType && allowedTypes.includes(secondary)
      ? secondary
      : undefined;

  const allowedSections = new Set<AuditSection>(AUDIT_PROFILE_SECTIONS[context.profile]);
  const seen = new Set<AuditSection>();
  const recommendedSections: OfferSection[] = response.recommendedSections
    .filter((item) => allowedSections.has(item.section) && !seen.has(item.section))
    .map((item) => {
      seen.add(item.section);
      return { section: item.section, justification: item.justification };
    })
    .slice(0, OFFER_LIMITS.maxSections);

  return {
    offerType,
    ...(secondaryOfferType ? { secondaryOfferType } : {}),
    offerTitle: response.offerTitle,
    mainObjective: response.mainObjective,
    recommendedSections,
    conversionStrategy: response.conversionStrategy,
    primaryCTA: response.primaryCTA,
    ...(response.secondaryCTA ? { secondaryCTA: response.secondaryCTA } : {}),
    valueProposition: response.valueProposition,
    linkedProblems: resolveLinkedProblems(response.linkedProblems, context.observedProblems),
  };
}

/**
 * Keeps only the problems whose area was actually observed. When the model quotes
 * areas nobody observed, the observed problems themselves are used instead — the
 * offer stays tied to real evidence, and no problem is invented.
 */
function resolveLinkedProblems(
  claimed: OfferLinkedProblem[],
  observed: OfferLinkedProblem[],
): OfferLinkedProblem[] {
  if (observed.length === 0) return claimed.slice(0, OFFER_LIMITS.maxLinkedProblems);

  const observedAreas = new Set<AuditProblemArea>(observed.map((item) => item.area));
  const kept = claimed.filter((item) => observedAreas.has(item.area));
  const source = kept.length > 0 ? kept : observed;

  const seen = new Set<string>();
  return source
    .filter((item) => {
      const key = `${item.area}:${item.problem.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, OFFER_LIMITS.maxLinkedProblems);
}

/** Result -> database columns. Prompts are never persisted. */
export function toOfferColumns(input: {
  result: OfferRecommendationResult;
  provider: string;
  model: string;
  businessProfile: string;
}): Omit<OfferInsert, "user_id" | "lead_id"> {
  const { result } = input;
  return {
    offer_type: result.offerType,
    secondary_offer_type: result.secondaryOfferType ?? null,
    offer_title: result.offerTitle,
    main_objective: result.mainObjective,
    recommended_sections: result.recommendedSections as unknown as NonNullable<
      OfferInsert["recommended_sections"]
    >,
    conversion_strategy: result.conversionStrategy,
    primary_cta: result.primaryCTA,
    secondary_cta: result.secondaryCTA ?? null,
    value_proposition: result.valueProposition,
    linked_problems: result.linkedProblems as unknown as NonNullable<
      OfferInsert["linked_problems"]
    >,
    provider: input.provider,
    model: input.model,
    business_profile: input.businessProfile,
  };
}

function isIn<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

function toSections(value: unknown): OfferSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const section = record["section"];
    const justification = record["justification"];
    if (!isIn<AuditSection>(AUDIT_SECTIONS, section)) return [];
    if (typeof justification !== "string" || !justification.trim()) return [];
    return [{ section, justification }];
  });
}

function toProblems(value: unknown): OfferLinkedProblem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const area = record["area"];
    const severity = record["severity"];
    const problem = record["problem"];
    if (!isIn<AuditProblemArea>(AUDIT_PROBLEM_AREAS, area)) return [];
    if (!isIn<AuditSeverity>(AUDIT_SEVERITIES, severity)) return [];
    if (typeof problem !== "string" || !problem.trim()) return [];
    return [{ area, severity, problem }];
  });
}

/** Database row -> domain object consumed by the UI. */
export function toStoredOffer(row: OfferRow): StoredOfferRecommendation {
  const offerType: OfferType = isIn<OfferType>(OFFER_TYPES, row.offer_type)
    ? row.offer_type
    : "INSTITUTIONAL";
  const secondary = isIn<OfferType>(OFFER_TYPES, row.secondary_offer_type)
    ? row.secondary_offer_type
    : undefined;

  return {
    id: row.id,
    leadId: row.lead_id,
    provider: row.provider,
    model: row.model,
    businessProfile: row.business_profile,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    offerType,
    ...(secondary ? { secondaryOfferType: secondary } : {}),
    offerTitle: row.offer_title,
    mainObjective: row.main_objective,
    recommendedSections: toSections(row.recommended_sections),
    conversionStrategy: row.conversion_strategy,
    primaryCTA: row.primary_cta,
    ...(row.secondary_cta ? { secondaryCTA: row.secondary_cta } : {}),
    valueProposition: row.value_proposition,
    linkedProblems: toProblems(row.linked_problems),
  };
}
