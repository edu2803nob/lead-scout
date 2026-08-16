import { queryOptions } from "@tanstack/react-query";

import { getLead, getLeadStats, listLeads } from "@/lib/leads.functions";
import type { ListLeadsParams } from "@/lib/validation/lead";

export const leadQueryKeys = {
  all: ["leads"] as const,
  list: (params: ListLeadsParams) => ["leads", "list", params] as const,
  detail: (id: string) => ["leads", "detail", id] as const,
  stats: ["leads", "stats"] as const,
};

export const leadListQuery = (params: ListLeadsParams) =>
  queryOptions({
    queryKey: leadQueryKeys.list(params),
    queryFn: () => listLeads({ data: params }),
  });

export const leadDetailQuery = (id: string) =>
  queryOptions({
    queryKey: leadQueryKeys.detail(id),
    queryFn: () => getLead({ data: { id } }),
  });

export const leadStatsQuery = () =>
  queryOptions({
    queryKey: leadQueryKeys.stats,
    queryFn: () => getLeadStats(),
  });
