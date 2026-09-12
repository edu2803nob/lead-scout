import { z } from "zod";

import { uuidSchema } from "./common";

/** Digital audit input: only an owned lead id (the user id comes from the token). */
export const auditLeadSchema = z.object({
  leadId: uuidSchema,
});

export type AuditLeadInput = z.infer<typeof auditLeadSchema>;
