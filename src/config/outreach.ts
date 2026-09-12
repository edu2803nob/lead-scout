/**
 * Configuration of the AI-assisted outreach module.
 *
 * The generator only writes a SUGGESTION for human review: nothing is sent
 * automatically, and every message must be anchored on real observed data.
 * A future WhatsApp integration must use official channels and respect the
 * applicable platform policies.
 */

export const OUTREACH_STYLES = ["CONSULTIVE", "DIRECT", "OPPORTUNITY"] as const;

export type OutreachStyle = (typeof OUTREACH_STYLES)[number];

export const OUTREACH_STYLE_LABELS: Record<OutreachStyle, string> = {
  CONSULTIVE: "Consultiva",
  DIRECT: "Direta",
  OPPORTUNITY: "Oportunidade",
};

export const OUTREACH_STYLE_GUIDES: Record<OutreachStyle, string> = {
  CONSULTIVE:
    "tom de especialista que ajuda: parte de uma observação real do negócio e sugere uma melhoria concreta, sem pressão comercial.",
  DIRECT:
    "tom objetivo e transparente: apresenta a observação e a proposta em poucas linhas, sem rodeios e sem exagero.",
  OPPORTUNITY:
    "tom que destaca o ganho possível a partir do que já existe hoje no negócio, sem prometer resultados nem números.",
};

export const OUTREACH_LIMITS = {
  /** Suggestions are short by design — long messages read as spam. */
  maxMessageChars: 480,
  minMessageChars: 40,
  maxReasonChars: 300,
  maxContextItems: 4,
  maxOutputTokens: 1_400,
  temperature: 0.4,
  task: "lead.outreach-message",
} as const;

/** Wording that would turn a suggestion into a false promise or spam. */
export const OUTREACH_FORBIDDEN_PATTERNS: RegExp[] = [
  /garant(o|imos|ia|ido)/i,
  /100%/,
  /dobr(ar|amos|o)\s+(seu|suas|seus)/i,
  /triplic/i,
  /resultado\s+garantido/i,
  /promo(ção|cao)\s+imperd/i,
  /última\s+chance/i,
  /clique\s+agora/i,
  /grátis\s+para\s+sempre/i,
];
