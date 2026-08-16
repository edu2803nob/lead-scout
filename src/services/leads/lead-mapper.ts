import type { Database } from "@/integrations/supabase/types";
import type { Lead } from "@/types/lead";
import type { LeadInput } from "@/lib/validation/lead";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

/** Persistence row -> domain entity. */
export function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    businessCategory: row.business_category,
    businessSubcategory: row.business_subcategory,
    description: row.description,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    websiteUrl: row.website_url,
    hasWebsite: row.has_website,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Domain input -> persistence columns (never includes user_id). */
export function toLeadColumns(input: LeadInput): Omit<LeadInsert, "user_id"> {
  return {
    company_name: input.companyName,
    business_category: input.businessCategory,
    business_subcategory: input.businessSubcategory,
    description: input.description,
    phone: input.phone,
    email: input.email,
    address: input.address,
    city: input.city,
    state: input.state,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    website_url: input.websiteUrl,
    has_website: input.hasWebsite,
    status: input.status,
    source: input.source,
  };
}

/** Domain entity -> form values, used by the edit form. */
export function toLeadFormValues(lead: Lead) {
  return {
    companyName: lead.companyName,
    businessCategory: lead.businessCategory ?? "",
    businessSubcategory: lead.businessSubcategory ?? "",
    description: lead.description ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    address: lead.address ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    country: lead.country ?? "",
    latitude: lead.latitude ?? "",
    longitude: lead.longitude ?? "",
    websiteUrl: lead.websiteUrl ?? "",
    hasWebsite: lead.hasWebsite,
    status: lead.status,
    source: lead.source,
  };
}
