import { z } from "zod";

import { LEAD_STATUSES } from "@/types/lead";

import { safeOptionalText, safeSearch, uuidSchema } from "./common";

/** Optional text: sanitized (control chars/HTML stripped), "" becomes null. */
const optionalText = (max = 255) => safeOptionalText(max);

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null)
  .refine((value) => value === null || z.string().email().safeParse(value).success, {
    message: "E-mail inválido",
  });

const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null)
  .refine((value) => value === null || /^https?:\/\/\S+\.\S+/.test(value), {
    message: "Informe uma URL válida iniciando com http:// ou https://",
  });

const optionalCoordinate = (min: number, max: number, label: string) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    })
    .refine((value) => value === null || (!Number.isNaN(value) && value >= min && value <= max), {
      message: `${label} deve estar entre ${min} e ${max}`,
    });

export const leadStatusSchema = z.enum(LEAD_STATUSES);

export const leadInputSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa (mínimo 2 caracteres)")
    .max(160, "Máximo de 160 caracteres"),
  businessCategory: optionalText(120),
  businessSubcategory: optionalText(120),
  description: optionalText(2000),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(240),
  city: optionalText(120),
  state: optionalText(120),
  country: optionalText(120),
  latitude: optionalCoordinate(-90, 90, "Latitude"),
  longitude: optionalCoordinate(-180, 180, "Longitude"),
  websiteUrl: optionalUrl,
  hasWebsite: z.boolean().optional().default(false),
  status: leadStatusSchema.optional().default("NEW"),
  source: z.string().trim().min(1).max(60).optional().default("MANUAL"),
});

export const createLeadSchema = leadInputSchema;

export const updateLeadSchema = z.object({
  id: uuidSchema,
  data: leadInputSchema,
});

export const leadIdSchema = z.object({
  id: uuidSchema,
});

export const listLeadsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(10),
  search: safeSearch(160),
  status: leadStatusSchema.nullable().optional().default(null),
  hasWebsite: z.boolean().nullable().optional().default(null),
  city: safeSearch(120),
});

export type LeadInput = z.output<typeof leadInputSchema>;
export type LeadFormValues = z.input<typeof leadInputSchema>;
export type ListLeadsParams = z.output<typeof listLeadsSchema>;
