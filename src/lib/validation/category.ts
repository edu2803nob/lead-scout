import { z } from "zod";

import { safeText, uuidSchema } from "./common";

/**
 * Slugs are the stable machine identifier of a category. They are normalized
 * (uppercase, accent-free, underscore separated) so new entries can be created
 * from the admin UI without code changes.
 */
export const categorySlugSchema = z
  .string()
  .trim()
  .min(2, "Informe um identificador com ao menos 2 caracteres")
  .max(60, "Máximo de 60 caracteres")
  .transform(normalizeSlug)
  .refine((value) => /^[A-Z0-9_]{2,60}$/.test(value), {
    message: "Use apenas letras, números e underscore",
  });

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const nameSchema = safeText(2, 80, "Nome");
const sortOrderSchema = z.number().int().min(0).max(100_000).optional().default(0);
const isActiveSchema = z.boolean().optional().default(true);

export const categoryInputSchema = z.object({
  slug: categorySlugSchema,
  name: nameSchema,
  sortOrder: sortOrderSchema,
  isActive: isActiveSchema,
});

export const subcategoryInputSchema = categoryInputSchema.extend({
  categoryId: uuidSchema,
});

export const updateCategorySchema = z.object({
  id: uuidSchema,
  data: z.object({
    name: nameSchema.optional(),
    sortOrder: z.number().int().min(0).max(100_000).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateSubcategorySchema = updateCategorySchema;

export const categoryIdSchema = z.object({ id: uuidSchema });

export const listCategoriesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type SubcategoryInput = z.infer<typeof subcategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesParams = z.infer<typeof listCategoriesSchema>;
