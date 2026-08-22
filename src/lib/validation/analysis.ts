import { z } from "zod";

import { uuidSchema } from "./common";

/** Commercial analysis input: only an owned lead id (user id comes from the token). */
export const analyzeLeadSchema = z.object({
  leadId: uuidSchema,
});

export type AnalyzeLeadInput = z.infer<typeof analyzeLeadSchema>;
