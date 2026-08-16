import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseOrThrow } from "@/lib/errors";
import {
  createLeadSchema,
  leadIdSchema,
  listLeadsSchema,
  updateLeadSchema,
} from "@/lib/validation/lead";
import { LeadRepository } from "@/services/leads/lead-repository";

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => parseOrThrow(listLeadsSchema, data ?? {}))
  .handler(({ data, context }) => new LeadRepository(context.supabase, context.userId).list(data));

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => parseOrThrow(leadIdSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).findById(data.id),
  );

export const getLeadStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => new LeadRepository(context.supabase, context.userId).stats());

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => parseOrThrow(createLeadSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).create(data),
  );

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => parseOrThrow(updateLeadSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).update(data.id, data.data),
  );

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => parseOrThrow(leadIdSchema, data))
  .handler(({ data, context }) =>
    new LeadRepository(context.supabase, context.userId).remove(data.id),
  );
