import { z } from "zod";

import { uuidSchema } from "./common";

/** Opportunity input: only an owned lead id (the user id comes from the token). */
export const analyzeOpportunitySchema = z.object({
  leadId: uuidSchema,
});

export type AnalyzeOpportunityInput = z.infer<typeof analyzeOpportunitySchema>;
