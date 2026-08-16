import type { Database } from "@/integrations/supabase/types";
import type { EnrichmentPatch, SocialSignals } from "@/types/enrichment";

import type { EnrichmentLead } from "./provider";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type SocialInsert = Database["public"]["Tables"]["lead_social_profiles"]["Insert"];

/** Row -> the minimal projection providers are allowed to see. */
export function toEnrichmentLead(row: LeadRow): EnrichmentLead {
  return {
    id: row.id,
    companyName: row.company_name,
    websiteUrl: row.website_url,
    hasWebsite: row.has_website,
    phone: row.phone,
    googlePlaceId: row.google_place_id,
    googleRating: row.google_rating,
    googleReviewCount: row.google_review_count,
    businessCategory: row.business_category,
    instagramUrl: row.instagram_url,
    instagramUsername: row.instagram_username,
    instagramFollowers: row.instagram_followers,
    instagramPostCount: row.instagram_post_count,
    instagramLastPostAt: row.instagram_last_post_at,
    hasWhatsapp: row.has_whatsapp,
  };
}

/**
 * Patch -> lead columns.
 * Only writes what was actually observed; `undefined` values are omitted so
 * existing data is never replaced by a guess.
 */
export function toLeadEnrichmentColumns(patch: EnrichmentPatch): LeadUpdate {
  const columns: LeadUpdate = {};

  if (patch.website) {
    columns.has_website = patch.website.hasWebsite;
    columns.website_quality = patch.website.quality;
    if (patch.website.url) columns.website_url = patch.website.url;
  }

  if (patch.google) {
    if (patch.google.rating !== null) columns.google_rating = patch.google.rating;
    if (patch.google.reviewCount !== null) columns.google_review_count = patch.google.reviewCount;
  }

  if (patch.whatsapp?.available === true) columns.has_whatsapp = true;

  const instagram = patch.social?.find((profile) => profile.network === "INSTAGRAM");
  if (instagram) {
    if (instagram.profileUrl) columns.instagram_url = instagram.profileUrl;
    if (instagram.username) columns.instagram_username = instagram.username;
    if (instagram.followers !== null) columns.instagram_followers = instagram.followers;
    if (instagram.postCount !== null) columns.instagram_post_count = instagram.postCount;
    if (instagram.lastPostAt) columns.instagram_last_post_at = instagram.lastPostAt;
  }

  return columns;
}

/** Social signals -> `lead_social_profiles` row (user id is added by the repo). */
export function toSocialProfileColumns(
  profile: SocialSignals,
): Omit<SocialInsert, "user_id" | "lead_id"> {
  return {
    network: profile.network,
    profile_url: profile.profileUrl,
    username: profile.username,
    followers: profile.followers,
    post_count: profile.postCount,
    last_post_at: profile.lastPostAt,
    activity_level: profile.activityLevel,
  };
}
