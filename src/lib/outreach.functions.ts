import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  generateOutreachSchema,
  leadOutreachSchema,
  markOutreachUsedSchema,
  updateOutreachMessageSchema,
} from "@/lib/validation/outreach";
import { OutreachService } from "@/services/outreach/outreach-service";

/**
 * Outreach generator endpoints.
 * - the session is validated server-side and every record is scoped to the user;
 * - the LLM runs only on explicit request, never on render;
 * - no message is ever dispatched: the app only suggests, the human sends.
 */

const readLimit = withRateLimit(RATE_LIMITS.leadRead);
const writeLimit = withRateLimit(RATE_LIMITS.leadWrite);

export const getLeadOutreach = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(leadOutreachSchema, data))
  .handler(({ data, context }) =>
    OutreachService.forUser(context.supabase, context.userId).getLatest(data.leadId),
  );

export const generateLeadOutreach = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(generateOutreachSchema, data))
  .handler(({ data, context }) =>
    OutreachService.forUser(context.supabase, context.userId).generate(data.leadId, {
      subject: context.userId,
      ...(data.styles ? { styles: data.styles } : {}),
    }),
  );

export const updateLeadOutreachMessage = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(updateOutreachMessageSchema, data))
  .handler(({ data, context }) =>
    OutreachService.forUser(context.supabase, context.userId).saveEdit(data.id, data.message),
  );

export const markLeadOutreachUsed = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(markOutreachUsedSchema, data))
  .handler(({ data, context }) =>
    OutreachService.forUser(context.supabase, context.userId).markUsed(data.id),
  );
