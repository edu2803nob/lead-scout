import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { PROSPECTING_RATE_LIMITS } from "@/lib/security/prospecting-limits";
import {
  importProspectionSchema,
  listProspectionsSchema,
  prospectionIdSchema,
  startProspectionSchema,
} from "@/lib/validation/prospecting";
import { ProspectionService } from "@/services/prospecting/prospection-service";

/**
 * Prospecting endpoints.
 *
 * - the session is validated server-side and the user id comes from the token;
 * - all inputs go through Zod schemas (sanitized, bounded);
 * - provider credentials never leave the server.
 */

const readLimit = withRateLimit(PROSPECTING_RATE_LIMITS.read);
const runLimit = withRateLimit(PROSPECTING_RATE_LIMITS.run);
const importLimit = withRateLimit(PROSPECTING_RATE_LIMITS.import);

export const listProspections = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(listProspectionsSchema, data ?? {}))
  .handler(({ data, context }) =>
    new ProspectionService(context.supabase, context.userId).list(data.limit),
  );

export const getProspection = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(prospectionIdSchema, data))
  .handler(({ data, context }) =>
    new ProspectionService(context.supabase, context.userId).detail(data.id),
  );

export const startProspection = createServerFn({ method: "POST" })
  .middleware([requireAuth, runLimit])
  .inputValidator((data: unknown) => parseOrThrow(startProspectionSchema, data))
  .handler(({ data, context }) =>
    new ProspectionService(context.supabase, context.userId).start(data),
  );

export const cancelProspection = createServerFn({ method: "POST" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(prospectionIdSchema, data))
  .handler(({ data, context }) =>
    new ProspectionService(context.supabase, context.userId).cancel(data.id),
  );

export const importProspection = createServerFn({ method: "POST" })
  .middleware([requireAuth, importLimit])
  .inputValidator((data: unknown) => parseOrThrow(importProspectionSchema, data))
  .handler(({ data, context }) =>
    new ProspectionService(context.supabase, context.userId).import(data),
  );
