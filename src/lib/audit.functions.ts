import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { auditLeadSchema } from "@/lib/validation/audit";
import { AuditService } from "@/services/audit/audit-service";

/**
 * Digital audit endpoints.
 * - the session is validated server-side and the lead is scoped to the user;
 * - the LLM only runs on explicit request, never on render;
 * - scores stay deterministic; provider credentials stay on the server.
 */

const readLimit = withRateLimit(RATE_LIMITS.leadRead);
const writeLimit = withRateLimit(RATE_LIMITS.leadWrite);

export const getLeadDigitalAudit = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(auditLeadSchema, data))
  .handler(({ data, context }) =>
    AuditService.forUser(context.supabase, context.userId).getLatest(data.leadId),
  );

export const auditLeadDigitally = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(auditLeadSchema, data))
  .handler(({ data, context }) =>
    AuditService.forUser(context.supabase, context.userId).auditLead(data.leadId, {
      subject: context.userId,
    }),
  );
