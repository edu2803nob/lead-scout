import { createServerFn } from "@tanstack/react-start";

import { requireAdmin, requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  categoryIdSchema,
  categoryInputSchema,
  listCategoriesSchema,
  subcategoryInputSchema,
  updateCategorySchema,
  updateSubcategorySchema,
} from "@/lib/validation/category";
import { CategoryRepository } from "@/services/categories/category-repository";

/**
 * Catalog endpoints. Reads require a session; every write requires the `admin`
 * role validated in the database (never trusting client-provided flags).
 */

const readLimit = withRateLimit(RATE_LIMITS.leadRead);
const writeLimit = withRateLimit(RATE_LIMITS.leadWrite);

export const listCategoryTree = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(listCategoriesSchema, data ?? {}))
  .handler(({ data, context }) =>
    new CategoryRepository(context.supabase).tree(data.includeInactive),
  );

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !error && Boolean(data) };
  });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(categoryInputSchema, data))
  .handler(({ data, context }) => new CategoryRepository(context.supabase).createCategory(data));

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(updateCategorySchema, data))
  .handler(({ data, context }) =>
    new CategoryRepository(context.supabase).updateCategory(data.id, data.data),
  );

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(categoryIdSchema, data))
  .handler(({ data, context }) => new CategoryRepository(context.supabase).removeCategory(data.id));

export const createSubcategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(subcategoryInputSchema, data))
  .handler(({ data, context }) => new CategoryRepository(context.supabase).createSubcategory(data));

export const updateSubcategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(updateSubcategorySchema, data))
  .handler(({ data, context }) =>
    new CategoryRepository(context.supabase).updateSubcategory(data.id, data.data),
  );

export const deleteSubcategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(categoryIdSchema, data))
  .handler(({ data, context }) =>
    new CategoryRepository(context.supabase).removeSubcategory(data.id),
  );
