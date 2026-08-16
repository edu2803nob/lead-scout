/** Domain types for the prospecting module (Google Places sourced). */

export const PROSPECTION_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type ProspectionStatus = (typeof PROSPECTION_STATUSES)[number];

export const PROSPECTION_STATUS_LABELS: Record<ProspectionStatus, string> = {
  PENDING: "Pendente",
  RUNNING: "Em execução",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
  CANCELLED: "Cancelada",
};

/** Only the fields the product needs — no private/personal data is collected. */
export interface PlaceResult {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  providerCategory: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Prospection {
  id: string;
  userId: string;
  name: string;
  provider: string;
  category: string | null;
  subcategory: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  radius: number | null;
  requestedLimit: number;
  status: ProspectionStatus;
  foundCount: number;
  importedCount: number;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectionResult extends PlaceResult {
  id: string;
  prospectionId: string;
  leadId: string | null;
  imported: boolean;
  createdAt: string;
}

export interface ProspectionDetail {
  prospection: Prospection;
  results: ProspectionResult[];
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
}

export const PROSPECTION_LIMITS = {
  /** Maximum number of places a single prospection may request. */
  maxResults: 120,
  /** Places API text search page size (provider maximum). */
  pageSize: 20,
  /** Maximum provider pages per prospection run. */
  maxPages: 6,
  /** Per-request timeout in milliseconds. */
  requestTimeoutMs: 12_000,
  /** Politeness delay between provider pages. */
  pageDelayMs: 350,
} as const;
