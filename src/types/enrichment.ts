/**
 * Domain types for the enrichment module.
 *
 * Rules encoded here:
 * - every indicator is nullable: when a source cannot be read the value stays
 *   `null` (or `UNKNOWN`) and is never guessed;
 * - no infrastructure imports (pure domain).
 */

export const SOCIAL_ACTIVITY_LEVELS = [
  "VERY_ACTIVE",
  "ACTIVE",
  "MODERATE",
  "INACTIVE",
  "UNKNOWN",
] as const;

export type SocialActivity = (typeof SOCIAL_ACTIVITY_LEVELS)[number];

export const SOCIAL_ACTIVITY_LABELS: Record<SocialActivity, string> = {
  VERY_ACTIVE: "Muito ativo",
  ACTIVE: "Ativo",
  MODERATE: "Moderado",
  INACTIVE: "Inativo",
  UNKNOWN: "Desconhecido",
};

export const WEBSITE_QUALITIES = [
  "NO_WEBSITE",
  "WEAK",
  "AVERAGE",
  "GOOD",
  "EXCELLENT",
  "UNKNOWN",
] as const;

export type WebsiteQuality = (typeof WEBSITE_QUALITIES)[number];

export const WEBSITE_QUALITY_LABELS: Record<WebsiteQuality, string> = {
  NO_WEBSITE: "Sem site",
  WEAK: "Fraco",
  AVERAGE: "Médio",
  GOOD: "Bom",
  EXCELLENT: "Excelente",
  UNKNOWN: "Desconhecido",
};

export const SOCIAL_NETWORKS = [
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "TIKTOK",
  "YOUTUBE",
  "X",
  "OTHER",
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const SOCIAL_NETWORK_LABELS: Record<SocialNetwork, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  X: "X",
  OTHER: "Outro",
};

/** Website / digital presence indicators. */
export interface WebsiteSignals {
  hasWebsite: boolean;
  url: string | null;
  quality: WebsiteQuality;
  /** `null` when the check was not technically possible (blocked/skipped). */
  reachable: boolean | null;
  statusCode: number | null;
  secure: boolean | null;
  hasTitle: boolean | null;
  hasDescription: boolean | null;
  responsive: boolean | null;
  hasContactChannel: boolean | null;
  title: string | null;
  description: string | null;
  checkedAt: string | null;
}

/** Social profile indicators (only publicly published data). */
export interface SocialSignals {
  network: SocialNetwork;
  profileUrl: string | null;
  username: string | null;
  followers: number | null;
  postCount: number | null;
  lastPostAt: string | null;
  activityLevel: SocialActivity;
}

/** Google Business indicators. */
export interface GoogleSignals {
  placeId: string | null;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
}

/** WhatsApp indicators — only when the source publishes it explicitly. */
export interface WhatsappSignals {
  available: boolean | null;
  link: string | null;
  phone: string | null;
}

export interface EnrichmentPatch {
  website?: WebsiteSignals;
  social?: SocialSignals[];
  google?: GoogleSignals;
  whatsapp?: WhatsappSignals;
}

export type ProviderStatus = "OK" | "SKIPPED" | "FAILED";

export interface ProviderOutcome {
  provider: string;
  label: string;
  status: ProviderStatus;
  message: string;
}

export interface EnrichmentResult {
  leadId: string;
  website: WebsiteSignals;
  social: SocialSignals[];
  google: GoogleSignals;
  whatsapp: WhatsappSignals;
  providers: ProviderOutcome[];
  enrichedAt: string;
}

export const ENRICHMENT_LIMITS = {
  /** Per-request timeout for any external read. */
  requestTimeoutMs: 8_000,
  /** Hard cap on HTML we read from a website (polite, single page). */
  maxHtmlBytes: 300_000,
  /** Maximum social profiles persisted per lead per run. */
  maxSocialProfiles: 6,
} as const;

export const EMPTY_WEBSITE_SIGNALS: WebsiteSignals = {
  hasWebsite: false,
  url: null,
  quality: "NO_WEBSITE",
  reachable: null,
  statusCode: null,
  secure: null,
  hasTitle: null,
  hasDescription: null,
  responsive: null,
  hasContactChannel: null,
  title: null,
  description: null,
  checkedAt: null,
};

export const EMPTY_GOOGLE_SIGNALS: GoogleSignals = {
  placeId: null,
  rating: null,
  reviewCount: null,
  categories: [],
};

export const EMPTY_WHATSAPP_SIGNALS: WhatsappSignals = {
  available: null,
  link: null,
  phone: null,
};
