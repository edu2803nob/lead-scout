import { z } from "zod";

import { uuidSchema } from "./common";

/** Scoring input: only an owned lead id (the user id comes from the token). */
export const scoreLeadSchema = z.object({
  leadId: uuidSchema,
});

export type ScoreLeadInput = z.infer<typeof scoreLeadSchema>;
