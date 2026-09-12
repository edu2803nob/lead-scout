import { queryOptions } from "@tanstack/react-query";

import { getLeadOffer } from "@/lib/offer.functions";

/**
 * Read-only query for the stored offer recommendation. It never triggers the
 * LLM — a new recommendation happens only through the explicit mutation.
 */
export const offerQueryKeys = {
  detail: (leadId: string) => ["lead-offer", leadId] as const,
};

export const leadOfferQuery = (leadId: string) =>
  queryOptions({
    queryKey: offerQueryKeys.detail(leadId),
    queryFn: () => getLeadOffer({ data: { leadId } }),
    staleTime: 5 * 60_000,
  });
