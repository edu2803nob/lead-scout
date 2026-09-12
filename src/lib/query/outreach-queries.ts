import { queryOptions } from "@tanstack/react-query";

import { getLeadOutreach } from "@/lib/outreach.functions";

/**
 * Read-only query for the stored outreach suggestions. It never triggers the
 * LLM — generation happens only through the explicit mutation.
 */
export const outreachQueryKeys = {
  detail: (leadId: string) => ["lead-outreach", leadId] as const,
};

export const leadOutreachQuery = (leadId: string) =>
  queryOptions({
    queryKey: outreachQueryKeys.detail(leadId),
    queryFn: () => getLeadOutreach({ data: { leadId } }),
    staleTime: 5 * 60_000,
  });
