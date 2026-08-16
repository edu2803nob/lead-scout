import { z } from "zod";

import { uuidSchema } from "./common";

/** Enrichment input: only an owned lead id is accepted (never a user id). */
export const enrichLeadSchema = z.object({
  leadId: uuidSchema,
});

export type EnrichLeadInput = z.infer<typeof enrichLeadSchema>;
