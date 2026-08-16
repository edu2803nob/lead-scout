import { describe, expect, it } from "vitest";

import {
  categoryInputSchema,
  categoryIdSchema,
  listCategoriesSchema,
  normalizeSlug,
  subcategoryInputSchema,
  updateCategorySchema,
} from "@/lib/validation/category";

describe("normalizeSlug", () => {
  it("uppercases, strips accents and joins with underscore", () => {
    expect(normalizeSlug("Açaiteria Premium")).toBe("ACAITERIA_PREMIUM");
    expect(normalizeSlug(" nail designer ")).toBe("NAIL_DESIGNER");
    expect(normalizeSlug("Lava-jato")).toBe("LAVA_JATO");
  });
});

describe("categoryInputSchema", () => {
  it("accepts a valid category and applies defaults", () => {
    const parsed = categoryInputSchema.parse({ slug: "Pet Shop", name: "Pet shop" });
    expect(parsed).toMatchObject({
      slug: "PET_SHOP",
      name: "Pet shop",
      sortOrder: 0,
      isActive: true,
    });
  });

  it("rejects short names and empty slugs", () => {
    expect(categoryInputSchema.safeParse({ slug: "OK", name: "a" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ slug: "", name: "Valido" }).success).toBe(false);
  });

  it("sanitizes HTML in names", () => {
    const parsed = categoryInputSchema.parse({ slug: "MODA", name: "<b>Moda</b>" });
    expect(parsed.name).not.toContain("<");
  });
});

describe("subcategoryInputSchema", () => {
  it("requires a valid parent uuid", () => {
    expect(
      subcategoryInputSchema.safeParse({ slug: "PIZZA", name: "Pizzaria", categoryId: "123" })
        .success,
    ).toBe(false);
    expect(
      subcategoryInputSchema.safeParse({
        slug: "PIZZA",
        name: "Pizzaria",
        categoryId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });
});

describe("update and id schemas", () => {
  it("rejects invalid identifiers", () => {
    expect(categoryIdSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ id: "1", data: { name: "X" } }).success).toBe(false);
  });

  it("accepts partial updates", () => {
    const parsed = updateCategorySchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      data: { isActive: false },
    });
    expect(parsed.data.isActive).toBe(false);
  });

  it("defaults inactive filter to false", () => {
    expect(listCategoriesSchema.parse({}).includeInactive).toBe(false);
  });
});
