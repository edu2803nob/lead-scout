import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { AppError, NotFoundError } from "@/lib/errors";
import type {
  CategoryInput,
  SubcategoryInput,
  UpdateCategoryInput,
} from "@/lib/validation/category";
import type { BusinessCategory, BusinessSubcategory, CategoryTreeNode } from "@/types/category";

type CategoryDb = SupabaseClient<Database>;
type CategoryRow = Database["public"]["Tables"]["business_categories"]["Row"];
type SubcategoryRow = Database["public"]["Tables"]["business_subcategories"]["Row"];

function fail(message: string, error: { message?: string } | null): never {
  throw new AppError(`${message}${error?.message ? `: ${error.message}` : ""}`, {
    code: "DB_ERROR",
    status: 500,
  });
}

function toCategory(row: CategoryRow): BusinessCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSubcategory(row: SubcategoryRow): BusinessSubcategory {
  return { ...toCategory(row as unknown as CategoryRow), categoryId: row.category_id };
}

/**
 * Catalog data access. Categories are global (shared by every user), readable by
 * anyone and writable only by admins — enforced by RLS policies in the database.
 */
export class CategoryRepository {
  constructor(private readonly db: CategoryDb) {}

  async tree(includeInactive: boolean): Promise<CategoryTreeNode[]> {
    let categoryQuery = this.db
      .from("business_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    let subQuery = this.db
      .from("business_subcategories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!includeInactive) {
      categoryQuery = categoryQuery.eq("is_active", true);
      subQuery = subQuery.eq("is_active", true);
    }

    const [categories, subcategories] = await Promise.all([categoryQuery, subQuery]);
    if (categories.error) fail("Não foi possível carregar as categorias", categories.error);
    if (subcategories.error) fail("Não foi possível carregar as subcategorias", subcategories.error);

    const grouped = new Map<string, BusinessSubcategory[]>();
    for (const row of subcategories.data ?? []) {
      const item = toSubcategory(row);
      const list = grouped.get(item.categoryId) ?? [];
      list.push(item);
      grouped.set(item.categoryId, list);
    }

    return (categories.data ?? []).map((row) => ({
      ...toCategory(row),
      subcategories: grouped.get(row.id) ?? [],
    }));
  }

  async createCategory(input: CategoryInput): Promise<BusinessCategory> {
    const { data, error } = await this.db
      .from("business_categories")
      .insert({
        slug: input.slug,
        name: input.name,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505" || error.code === "23000" || error.code === "23514") {
        throw new AppError("Já existe uma categoria com este identificador.", { status: 409 });
      }
      if (error.code === "23505") throw new AppError("Categoria duplicada.", { status: 409 });
      fail("Não foi possível criar a categoria", error);
    }
    return toCategory(data!);
  }

  async createSubcategory(input: SubcategoryInput): Promise<BusinessSubcategory> {
    const { data, error } = await this.db
      .from("business_subcategories")
      .insert({
        category_id: input.categoryId,
        slug: input.slug,
        name: input.name,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      })
      .select("*")
      .single();
    if (error) fail("Não foi possível criar a subcategoria", error);
    return toSubcategory(data!);
  }

  async updateCategory(id: string, patch: UpdateCategoryInput["data"]): Promise<BusinessCategory> {
    const { data, error } = await this.db
      .from("business_categories")
      .update(toColumns(patch))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) fail("Não foi possível atualizar a categoria", error);
    if (!data) throw new NotFoundError("Categoria não encontrada");
    return toCategory(data);
  }

  async updateSubcategory(
    id: string,
    patch: UpdateCategoryInput["data"],
  ): Promise<BusinessSubcategory> {
    const { data, error } = await this.db
      .from("business_subcategories")
      .update(toColumns(patch))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) fail("Não foi possível atualizar a subcategoria", error);
    if (!data) throw new NotFoundError("Subcategoria não encontrada");
    return toSubcategory(data);
  }

  async removeCategory(id: string): Promise<{ id: string }> {
    const { error } = await this.db.from("business_categories").delete().eq("id", id);
    if (error) fail("Não foi possível remover a categoria", error);
    return { id };
  }

  async removeSubcategory(id: string): Promise<{ id: string }> {
    const { error } = await this.db.from("business_subcategories").delete().eq("id", id);
    if (error) fail("Não foi possível remover a subcategoria", error);
    return { id };
  }
}

function toColumns(patch: UpdateCategoryInput["data"]): {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
} {
  return {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
    ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
  };
}
