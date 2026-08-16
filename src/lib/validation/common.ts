import { z } from "zod";

import { sanitizeSearchTerm, sanitizeText } from "@/lib/security/sanitize";

/** Strict UUID validation for every identifier that reaches the database. */
export const uuidSchema = z.string().trim().uuid("Identificador inválido");

export const idParamSchema = z.object({ id: uuidSchema });

/** Required free text: sanitized, length bounded. */
export const safeText = (min: number, max: number, label = "Campo") =>
  z
    .string()
    .transform(sanitizeText)
    .refine((value) => value.length >= min, {
      message: `${label} deve ter ao menos ${min} caractere(s)`,
    })
    .refine((value) => value.length <= max, { message: `Máximo de ${max} caracteres` });

/** Optional free text: sanitized, empty becomes null. */
export const safeOptionalText = (max: number) =>
  z
    .string()
    .transform(sanitizeText)
    .refine((value) => value.length <= max, { message: `Máximo de ${max} caracteres` })
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

/** Search term with wildcard characters stripped (safe for ilike filters). */
export const safeSearch = (max = 160) =>
  z
    .string()
    .max(max * 2)
    .transform(sanitizeSearchTerm)
    .refine((value) => value.length <= max, { message: `Máximo de ${max} caracteres` })
    .optional()
    .default("");

export const paginationSchema = z.object({
  page: z.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(10),
});
