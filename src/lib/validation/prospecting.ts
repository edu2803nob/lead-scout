import { z } from "zod";

import { PROSPECTION_LIMITS, PROSPECTION_STATUSES } from "@/types/prospecting";

import { safeOptionalText, safeText, uuidSchema } from "./common";

/**
 * All prospecting inputs are validated (and sanitized) here before reaching the
 * provider or the database. Free text is bounded so no unbounded payload is
 * ever forwarded to Google.
 */

export const prospectionStatusSchema = z.enum(PROSPECTION_STATUSES);

export const startProspectionSchema = z.object({
  category: safeText(2, 80, "Categoria"),
  subcategory: safeOptionalText(80),
  city: safeText(2, 80, "Cidade"),
  state: safeText(2, 40, "Estado"),
  neighborhood: safeOptionalText(80),
  /** Search radius in kilometres. */
  radiusKm: z.coerce.number().int().min(1, "Raio mínimo de 1 km").max(50, "Raio máximo de 50 km"),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Solicite ao menos 1 resultado")
    .max(
      PROSPECTION_LIMITS.maxResults,
      `Máximo de ${PROSPECTION_LIMITS.maxResults} resultados por prospecção`,
    ),
});

export const prospectionIdSchema = z.object({ id: uuidSchema });

export const importProspectionSchema = z.object({
  id: uuidSchema,
  /** Empty/omitted means "import every result of this prospection". */
  resultIds: z.array(uuidSchema).max(PROSPECTION_LIMITS.maxResults).optional().default([]),
});

export const listProspectionsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export type StartProspectionInput = z.output<typeof startProspectionSchema>;
export type ProspectionFormValues = z.input<typeof startProspectionSchema>;
export type ImportProspectionInput = z.output<typeof importProspectionSchema>;
