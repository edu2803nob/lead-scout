import { z } from "zod";

import { OUTREACH_LIMITS, OUTREACH_STYLES, type OutreachStyle } from "@/config/outreach";

/**
 * Response contract for the outreach generator.
 *
 * Strict about meaning, tolerant of harmless formatting habits (lowercase or
 * Portuguese style names, a single object instead of a list). Anything that
 * cannot be normalised is rejected and nothing is persisted.
 */

const STYLE_ALIASES: Record<string, OutreachStyle> = {
  CONSULTIVA: "CONSULTIVE",
  CONSULTIVO: "CONSULTIVE",
  DIRETA: "DIRECT",
  DIRETO: "DIRECT",
  OPORTUNIDADE: "OPPORTUNITY",
};

function normalizeEnum(value: unknown): unknown {
  return typeof value === "string"
    ? value
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s-]+/g, "_")
    : value;
}

const styleField = z.preprocess((value) => {
  const normalized = normalizeEnum(value);
  return typeof normalized === "string" ? (STYLE_ALIASES[normalized] ?? normalized) : normalized;
}, z.enum(OUTREACH_STYLES));

const messageField = z.preprocess(
  (value) => (typeof value === "string" ? value.replace(/\s+\n/g, "\n").trim() : value),
  z.string().trim().min(20).max(OUTREACH_LIMITS.maxMessageChars * 2),
);

export const outreachMessageResponseSchema = z.object({
  style: styleField,
  message: messageField,
  reason: z.string().trim().min(3).max(OUTREACH_LIMITS.maxReasonChars * 2),
});

const toArray = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record["messages"])) return record["messages"];
    if (Array.isArray(record["abordagens"])) return record["abordagens"];
    if (record["style"] ?? record["message"]) return [value];
  }
  return value;
};

export const outreachResponseSchema = z.object({
  messages: z.preprocess(toArray, z.array(outreachMessageResponseSchema).min(1).max(6)),
});

export type OutreachMessageResponse = z.infer<typeof outreachMessageResponseSchema>;
export type OutreachResponse = z.infer<typeof outreachResponseSchema>;
