import { queryOptions } from "@tanstack/react-query";

import { getLeadAnalysis } from "@/lib/analysis.functions";

/**
 * Read-only query for the stored analysis. It never triggers the LLM — a new
 * analysis happens only through the explicit mutation.
 */
export const analysisQueryKeys = {
  detail: (leadId: string) => ["lead-analysis", leadId] as const,
};

export const leadAnalysisQuery = (leadId: string) =>
  queryOptions({
    queryKey: analysisQueryKeys.detail(leadId),
    queryFn: () => getLeadAnalysis({ data: { leadId } }),
    staleTime: 5 * 60_000,
  });
