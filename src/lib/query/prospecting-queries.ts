import { queryOptions } from "@tanstack/react-query";

import { getProspection, listProspections } from "@/lib/prospecting.functions";

export const prospectingQueryKeys = {
  all: ["prospections"] as const,
  list: (limit: number) => ["prospections", "list", limit] as const,
  detail: (id: string) => ["prospections", "detail", id] as const,
};

export const prospectionsQuery = (limit = 20) =>
  queryOptions({
    queryKey: prospectingQueryKeys.list(limit),
    queryFn: () => listProspections({ data: { limit } }),
  });

export const prospectionDetailQuery = (id: string) =>
  queryOptions({
    queryKey: prospectingQueryKeys.detail(id),
    queryFn: () => getProspection({ data: { id } }),
  });
