import { redactSecrets } from "@/lib/security/redact";
import type { SocialNetwork } from "@/types/enrichment";
import { ENRICHMENT_LIMITS } from "@/types/enrichment";

import type { SiteSnapshot } from "./provider";

/**
 * Polite, single-page inspection of the lead's OWN website.
 *
 * Boundaries respected here:
 * - `robots.txt` is read first and honoured; a disallowed path is not fetched;
 * - one GET per run, capped body size, short timeout — no crawling, no
 *   parallel hammering, no third-party platform scraping;
 * - only public markup metadata is read (title, description, viewport, links).
 */

const USER_AGENT = "LeadHunterBot/1.0 (+enrichment; respects robots.txt)";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Adds a protocol when missing and rejects anything that is not http(s). */
export function normalizeWebsiteUrl(raw: string | null | undefined): URL | null {
  const value = (raw ?? "").trim();
  if (value.length === 0) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

/** Minimal robots.txt evaluation for our own user-agent (and the `*` group). */
export function isPathAllowedByRobots(robotsTxt: string, path: string): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; path: string }> }> = [];
  let current: (typeof groups)[number] | null = null;
  let collectingAgents = false;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (line.length === 0) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || !collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
        collectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    collectingAgents = false;
    if (field === "disallow") current.rules.push({ allow: false, path: value });
    if (field === "allow") current.rules.push({ allow: true, path: value });
  }

  const agentName = "leadhunterbot";
  const specific = groups.filter((group) => group.agents.some((a) => agentName.startsWith(a) && a));
  const wildcard = groups.filter((group) => group.agents.includes("*"));
  const applicable = specific.length > 0 ? specific : wildcard;
  if (applicable.length === 0) return true;

  let decision = true;
  let bestLength = -1;
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (rule.path === "") continue;
      if (!path.startsWith(rule.path)) continue;
      if (rule.path.length > bestLength) {
        bestLength = rule.path.length;
        decision = rule.allow;
      }
    }
  }
  return decision;
}

const SOCIAL_PATTERNS: Array<{ network: SocialNetwork; host: RegExp }> = [
  { network: "INSTAGRAM", host: /(^|\.)instagram\.com$/i },
  { network: "FACEBOOK", host: /(^|\.)(facebook|fb)\.com$/i },
  { network: "LINKEDIN", host: /(^|\.)linkedin\.com$/i },
  { network: "TIKTOK", host: /(^|\.)tiktok\.com$/i },
  { network: "YOUTUBE", host: /(^|\.)(youtube\.com|youtu\.be)$/i },
  { network: "X", host: /(^|\.)(twitter\.com|x\.com)$/i },
];

/** Identifies the network and the public username of a profile URL. */
export function detectSocialProfile(
  raw: string,
): { network: SocialNetwork; url: string; username: string | null } | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const match = SOCIAL_PATTERNS.find((pattern) => pattern.host.test(url.hostname));
  if (!match) return null;

  const segments = url.pathname.split("/").filter((part) => part.length > 0);
  const first = segments[0] ?? null;
  const ignored = new Set([
    "share",
    "sharer",
    "sharer.php",
    "intent",
    "watch",
    "p",
    "reel",
    "explore",
    "hashtag",
    "channel",
    "results",
  ]);

  let username: string | null = null;
  if (first && !ignored.has(first.toLowerCase())) {
    username = first.replace(/^@/, "").slice(0, 60) || null;
  }
  if (match.network === "LINKEDIN" && (first === "company" || first === "in")) {
    username = segments[1]?.slice(0, 60) ?? null;
  }

  return {
    network: match.network,
    url: `${url.origin}${url.pathname}`.replace(/\/$/, ""),
    username,
  };
}

const WHATSAPP_HOSTS = /(^|\.)(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp\.com)$/i;

/** Extracts explicitly published WhatsApp links (never inferred from a phone). */
export function extractWhatsappLinks(hrefs: string[]): string[] {
  const found: string[] = [];
  for (const href of hrefs) {
    try {
      const url = new URL(href);
      if (WHATSAPP_HOSTS.test(url.hostname)) found.push(url.toString());
    } catch {
      continue;
    }
  }
  return [...new Set(found)].slice(0, 5);
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(tag);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

export interface ParsedSite {
  title: string | null;
  description: string | null;
  responsive: boolean;
  hasContactChannel: boolean;
  hrefs: string[];
}

/** Pure HTML metadata extraction (no DOM, no third-party parser). */
export function parseSiteHtml(html: string): ParsedSite {
  const title = /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(html)?.[1]?.trim() ?? null;

  let description: string | null = null;
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = (attribute(tag, "name") ?? attribute(tag, "property") ?? "").toLowerCase();
    if (name === "description" || name === "og:description") {
      description = attribute(tag, "content")?.trim() ?? null;
      if (description) break;
    }
  }

  const responsive = (html.match(/<meta\b[^>]*>/gi) ?? []).some(
    (tag) =>
      (attribute(tag, "name") ?? "").toLowerCase() === "viewport" &&
      /width\s*=\s*device-width/i.test(attribute(tag, "content") ?? ""),
  );

  const hrefs: string[] = [];
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attribute(tag, "href");
    if (href) hrefs.push(href.trim());
  }

  const hasContactChannel =
    hrefs.some((href) => /^(tel:|mailto:)/i.test(href)) ||
    extractWhatsappLinks(hrefs).length > 0 ||
    /<form\b/i.test(html);

  return {
    title: title && title.length > 0 ? title.slice(0, 200) : null,
    description: description && description.length > 0 ? description.slice(0, 300) : null,
    responsive,
    hasContactChannel,
    hrefs,
  };
}

function absolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export class SiteBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteBlockedError";
  }
}

async function readCapped(response: Response): Promise<string> {
  const text = await response.text();
  return text.slice(0, ENRICHMENT_LIMITS.maxHtmlBytes);
}

/** Fetches robots.txt and returns whether the target path may be read. */
async function robotsAllows(url: URL, doFetch: FetchLike): Promise<boolean> {
  try {
    const response = await doFetch(`${url.origin}/robots.txt`, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
      signal: AbortSignal.timeout(ENRICHMENT_LIMITS.requestTimeoutMs),
    });
    if (response.status === 404 || response.status === 410) return true;
    if (!response.ok) return true;
    const body = (await response.text()).slice(0, 100_000);
    return isPathAllowedByRobots(body, url.pathname || "/");
  } catch {
    // robots.txt unreachable: stay conservative but do not block the whole run.
    return true;
  }
}

/**
 * Reads a single page from the lead's website.
 * Returns `null` when the check is not technically possible.
 */
export async function inspectWebsite(
  rawUrl: string,
  options: { fetchImpl?: FetchLike } = {},
): Promise<SiteSnapshot | null> {
  const url = normalizeWebsiteUrl(rawUrl);
  if (!url) return null;
  const doFetch: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));

  if (!(await robotsAllows(url, doFetch))) {
    throw new SiteBlockedError("O site não permite leitura automatizada (robots.txt).");
  }

  let response: Response;
  try {
    response = await doFetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(ENRICHMENT_LIMITS.requestTimeoutMs),
    });
  } catch (error) {
    console.error(
      `[enrichment] website unreachable: ${redactSecrets(
        error instanceof Error ? error.message : "unknown",
      ).slice(0, 200)}`,
    );
    return null;
  }

  const finalUrl = response.url || url.toString();
  const secure = finalUrl.startsWith("https://");

  if (!response.ok) {
    return {
      finalUrl,
      secure,
      statusCode: response.status,
      title: null,
      description: null,
      responsive: false,
      hasContactChannel: false,
      socialLinks: [],
      whatsappLinks: [],
    };
  }

  const html = await readCapped(response);
  const parsed = parseSiteHtml(html);
  const absoluteHrefs = parsed.hrefs
    .map((href) => absolute(href, finalUrl))
    .filter((href): href is string => Boolean(href));

  const socialLinks: SiteSnapshot["socialLinks"] = [];
  const seen = new Set<string>();
  for (const href of absoluteHrefs) {
    const profile = detectSocialProfile(href);
    if (!profile || !profile.username) continue;
    const key = `${profile.network}:${profile.username.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    socialLinks.push(profile);
    if (socialLinks.length >= ENRICHMENT_LIMITS.maxSocialProfiles) break;
  }

  return {
    finalUrl,
    secure,
    statusCode: response.status,
    title: parsed.title,
    description: parsed.description,
    responsive: parsed.responsive,
    hasContactChannel: parsed.hasContactChannel,
    socialLinks,
    whatsappLinks: extractWhatsappLinks(absoluteHrefs),
  };
}
