import {
  OUTREACH_FORBIDDEN_PATTERNS,
  OUTREACH_LIMITS,
  OUTREACH_STYLES,
  type OutreachStyle,
} from "@/config/outreach";
import type { Database } from "@/integrations/supabase/types";
import type { OutreachMessageResult, StoredOutreachMessage } from "@/types/outreach";

import type { OutreachMessageResponse } from "./outreach-schema";

type OutreachRow = Database["public"]["Tables"]["lead_outreach_messages"]["Row"];
type OutreachInsert = Database["public"]["Tables"]["lead_outreach_messages"]["Insert"];

/** Removes markdown noise and collapses whitespace, keeping plain readable text. */
export function normalizeMessageText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#>]+/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Enforces the message contract that cannot be trusted to the model:
 * - short (hard character cap, trimmed at a sentence boundary);
 * - ends with a simple question;
 * - contains no false promise / spam wording.
 *
 * Returns `null` when the message cannot be made compliant — an invalid
 * suggestion is discarded instead of being shown to the user.
 */
export function sanitizeOutreachMessage(text: string): string | null {
  const normalized = normalizeMessageText(text);
  if (!normalized) return null;
  if (OUTREACH_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(normalized))) return null;

  const sentences = splitSentences(normalized);
  if (sentences.length === 0) return null;

  // Keep sentences up to the character cap.
  const kept: string[] = [];
  for (const sentence of sentences) {
    const candidate = [...kept, sentence].join(" ");
    if (candidate.length > OUTREACH_LIMITS.maxMessageChars) break;
    kept.push(sentence);
  }
  if (kept.length === 0) return null;

  // Must end with a question: drop trailing statements after the last question.
  const lastQuestion = kept.reduce(
    (index, sentence, current) => (sentence.endsWith("?") ? current : index),
    -1,
  );
  if (lastQuestion === -1) return null;

  const message = kept.slice(0, lastQuestion + 1).join(" ").trim();
  return message.length >= OUTREACH_LIMITS.minMessageChars ? message : null;
}

export function isOutreachStyle(value: unknown): value is OutreachStyle {
  return typeof value === "string" && (OUTREACH_STYLES as readonly string[]).includes(value);
}

/**
 * Model response -> stored results. One message per requested style, de-duplicated;
 * non-compliant suggestions are discarded (never "fixed" with invented content).
 */
export function toOutreachResults(
  responses: OutreachMessageResponse[],
  requestedStyles: readonly OutreachStyle[],
): OutreachMessageResult[] {
  const wanted = new Set<OutreachStyle>(requestedStyles);
  const seen = new Set<OutreachStyle>();
  const results: OutreachMessageResult[] = [];

  for (const response of responses) {
    if (!wanted.has(response.style) || seen.has(response.style)) continue;
    const message = sanitizeOutreachMessage(response.message);
    if (!message) continue;
    seen.add(response.style);
    results.push({
      style: response.style,
      message,
      reason: normalizeMessageText(response.reason).slice(0, OUTREACH_LIMITS.maxReasonChars),
    });
  }

  return results.sort(
    (a, b) => requestedStyles.indexOf(a.style) - requestedStyles.indexOf(b.style),
  );
}

export function toOutreachColumns(input: {
  result: OutreachMessageResult;
  batchId: string;
  provider: string;
  model: string;
  businessProfile: string;
}): Omit<OutreachInsert, "user_id" | "lead_id"> {
  return {
    batch_id: input.batchId,
    style: input.result.style,
    message: input.result.message,
    reason: input.result.reason,
    provider: input.provider,
    model: input.model,
    business_profile: input.businessProfile,
  };
}

export function toStoredOutreach(row: OutreachRow): StoredOutreachMessage {
  return {
    id: row.id,
    leadId: row.lead_id,
    batchId: row.batch_id,
    style: isOutreachStyle(row.style) ? row.style : "CONSULTIVE",
    message: row.message,
    reason: row.reason,
    isEdited: row.is_edited,
    usedAt: row.used_at,
    provider: row.provider,
    model: row.model,
    businessProfile: row.business_profile,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
