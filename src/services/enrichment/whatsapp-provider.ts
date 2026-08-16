import { sanitizePhone } from "@/lib/security/sanitize";
import type { WhatsappSignals } from "@/types/enrichment";

import type { EnrichmentContext, EnrichmentProvider, ProviderOutput } from "./provider";

/**
 * WhatsApp indicators.
 *
 * Only accepted when the company publishes an explicit WhatsApp link
 * (wa.me / api.whatsapp.com) on its own website, or when the lead was already
 * flagged by an authorized source. A phone number alone is NEVER assumed to be
 * a WhatsApp number.
 */

/** Extracts the phone from a published WhatsApp link, when present. */
export function whatsappPhoneFromLink(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }

  const fromQuery = url.searchParams.get("phone");
  const fromPath = url.pathname.split("/").filter(Boolean)[0] ?? "";
  const raw = fromQuery ?? fromPath;
  const digits = sanitizePhone(raw).replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

export class WhatsappProvider implements EnrichmentProvider {
  readonly id = "whatsapp";
  readonly label = "WhatsApp";

  supports(context: EnrichmentContext): boolean {
    return Boolean(context.snapshot?.whatsappLinks.length || context.lead.hasWhatsapp);
  }

  async enrich(context: EnrichmentContext): Promise<ProviderOutput> {
    const links = context.snapshot?.whatsappLinks ?? [];
    const link = links[0] ?? null;

    if (!link) {
      if (context.lead.hasWhatsapp) {
        const whatsapp: WhatsappSignals = { available: true, link: null, phone: null };
        return { patch: { whatsapp }, status: "OK", message: "WhatsApp já registrado no lead." };
      }
      return {
        patch: {},
        status: "SKIPPED",
        message: "Nenhum link de WhatsApp publicado pela empresa.",
      };
    }

    const whatsapp: WhatsappSignals = {
      available: true,
      link,
      phone: whatsappPhoneFromLink(link),
    };
    return { patch: { whatsapp }, status: "OK", message: "WhatsApp publicado no site da empresa." };
  }
}
