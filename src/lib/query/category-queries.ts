import { queryOptions } from "@tanstack/react-query";

import { isCurrentUserAdmin, listCategoryTree } from "@/lib/categories.functions";

export const categoryQueryKeys = {
  all: ["categories"] as const,
  tree: (includeInactive: boolean) => ["categories", "tree", includeInactive] as const,
  isAdmin: ["categories", "is-admin"] as const,
};

export const categoryTreeQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: categoryQueryKeys.tree(includeInactive),
    queryFn: () => listCategoryTree({ data: { includeInactive } }),
  });

export const isAdminQuery = () =>
  queryOptions({
    queryKey: categoryQueryKeys.isAdmin,
    queryFn: () => isCurrentUserAdmin(),
  });
