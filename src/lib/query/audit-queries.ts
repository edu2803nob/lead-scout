import { queryOptions } from "@tanstack/react-query";

import { getLeadDigitalAudit } from "@/lib/audit.functions";

/**
 * Read-only query for the stored digital audit. It never triggers the LLM — a
 * new audit happens only through the explicit mutation.
 */
export const auditQueryKeys = {
  detail: (leadId: string) => ["lead-digital-audit", leadId] as const,
};

export const leadDigitalAuditQuery = (leadId: string) =>
  queryOptions({
    queryKey: auditQueryKeys.detail(leadId),
    queryFn: () => getLeadDigitalAudit({ data: { leadId } }),
    staleTime: 5 * 60_000,
  });
