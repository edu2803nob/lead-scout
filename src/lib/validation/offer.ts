import { z } from "zod";

import { uuidSchema } from "./common";

/** Offer recommendation input: only an owned lead id (user id comes from the token). */
export const recommendOfferSchema = z.object({
  leadId: uuidSchema,
});

export type RecommendOfferInput = z.infer<typeof recommendOfferSchema>;
