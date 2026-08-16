import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  createLeadSchema,
  leadIdSchema,
  listLeadsSchema,
  updateLeadSchema,
} from "@/lib/validation/lead";
import { LeadRepository } from "@/services/leads/lead-repository";

/**
 * Every function below:
 * - validates the session server-side (`requireAuth`);
 * - scopes data to `context.userId` taken from the verified token (never from input);
 * - validates input with a Zod schema before touching the database;
 * - throttles sensitive writes per user.
 */

const readLimit = withRateLimit(RATE_LIMITS.leadRead);
const writeLimit = withRateLimit(RATE_LIMITS.leadWrite);
const deleteLimit = withRateLimit(RATE_LIMITS.leadDelete);

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(listLeadsSchema, data ?? {}))
  .handler(({ data, context }) => new LeadRepository(context.supabase, context.userId).list(data));

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(leadIdSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).findById(data.id),
  );

export const getLeadStats = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .handler(({ context }) => new LeadRepository(context.supabase, context.userId).stats());

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(createLeadSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).create(data),
  );

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(updateLeadSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).update(data.id, data.data),
  );

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireAuth, deleteLimit])
  .inputValidator((data: unknown) => parseOrThrow(leadIdSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).remove(data.id),
  );
