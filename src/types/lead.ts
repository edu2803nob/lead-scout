/**
 * Domain types for the Lead entity.
 * Keep this file free of infrastructure concerns (no Supabase / HTTP imports).
 */

export const LEAD_STATUSES = [
  "NEW",
  "QUALIFIED",
  "CONTACT_READY",
  "CONTACTED",
  "RESPONDED",
  "MEETING",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
  "NO_INTEREST",
  "NO_RESPONSE",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Novo",
  QUALIFIED: "Qualificado",
  CONTACT_READY: "Pronto p/ contato",
  CONTACTED: "Contatado",
  RESPONDED: "Respondeu",
  MEETING: "Reunião",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  LOST: "Perdido",
  NO_INTEREST: "Sem interesse",
  NO_RESPONSE: "Sem resposta",
};

/** Statuses that represent an active (still workable) opportunity. */
export const OPEN_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "QUALIFIED",
  "CONTACT_READY",
  "CONTACTED",
  "RESPONDED",
  "MEETING",
  "PROPOSAL",
  "NEGOTIATION",
];

export interface Lead {
  id: string;
  userId: string;
  companyName: string;
  businessCategory: string | null;
  businessSubcategory: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  hasWebsite: boolean;
  status: LeadStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListResult {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface LeadStats {
  total: number;
  open: number;
  won: number;
  withoutWebsite: number;
  byStatus: Record<LeadStatus, number>;
}
