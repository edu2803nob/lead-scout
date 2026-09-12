import { z } from "zod";

import { OUTREACH_LIMITS, OUTREACH_STYLES } from "@/config/outreach";

import { uuidSchema } from "./common";

/** Outreach inputs: only owned ids and text (user id always comes from the token). */

export const leadOutreachSchema = z.object({
  leadId: uuidSchema,
});

export const generateOutreachSchema = z.object({
  leadId: uuidSchema,
  styles: z.array(z.enum(OUTREACH_STYLES)).min(1).max(OUTREACH_STYLES.length).optional(),
});

export const updateOutreachMessageSchema = z.object({
  id: uuidSchema,
  message: z
    .string()
    .trim()
    .min(OUTREACH_LIMITS.minMessageChars)
    .max(OUTREACH_LIMITS.maxMessageChars),
});

export const markOutreachUsedSchema = z.object({
  id: uuidSchema,
});

export type GenerateOutreachInput = z.infer<typeof generateOutreachSchema>;
export type UpdateOutreachMessageInput = z.infer<typeof updateOutreachMessageSchema>;
