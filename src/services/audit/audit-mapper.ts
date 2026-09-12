import {
  AUDIT_LIMITS,
  AUDIT_PROBLEM_AREAS,
  AUDIT_PROFILE_SECTIONS,
  AUDIT_SECTIONS,
  AUDIT_SEVERITIES,
  type AuditProblemArea,
  type AuditSection,
  type AuditSeverity,
} from "@/config/digital-audit";
import type { BusinessProfile } from "@/config/commercial-analysis";
import type { Database } from "@/integrations/supabase/types";
import type { AnalysisEvidenceItem, AnalysisStatementKind } from "@/types/analysis";
import type {
  AuditConversionProblem,
  AuditRecommendedSection,
  DigitalAuditResult,
  StoredDigitalAudit,
} from "@/types/audit";

import type { DigitalAuditResponse } from "./audit-schema";

type AuditRow = Database["public"]["Tables"]["digital_audits"]["Row"];
type AuditInsert = Database["public"]["Tables"]["digital_audits"]["Insert"];

export interface AuditScores {
  digitalPresenceScore: number;
  conversionOpportunity: number;
  landingPageOpportunity: number;
}

/**
 * Merges the deterministic scores with the model's interpretation, dropping any
 * section that does not belong to the detected segment (defence in depth on top
 * of the prompt) and de-duplicating repeated sections.
 */
export function toAuditResult(
  response: DigitalAuditResponse,
  scores: AuditScores,
  profile: BusinessProfile,
): DigitalAuditResult {
  const allowed = new Set<AuditSection>(AUDIT_PROFILE_SECTIONS[profile]);
  const seen = new Set<AuditSection>();

  const recommendedSections = response.recommendedSections
    .filter((item) => allowed.has(item.section) && !seen.has(item.section))
    .map((item) => {
      seen.add(item.section);
      return { section: item.section, justification: item.justification };
    })
    .slice(0, AUDIT_LIMITS.maxSections);

  return {
    digitalPresenceScore: clamp(scores.digitalPresenceScore),
    conversionOpportunity: clamp(scores.conversionOpportunity),
    landingPageOpportunity: clamp(scores.landingPageOpportunity),
    auditSummary: response.auditSummary,
    conversionProblems: response.conversionProblems.map((item) => ({
      area: item.area,
      severity: item.severity,
      problem: item.problem,
      ...(item.source ? { source: item.source } : {}),
    })),
    recommendedSections,
    evidence: response.evidence.map((item) => ({
      kind: item.kind,
      statement: item.statement,
      ...(item.source ? { source: item.source } : {}),
    })),
  };
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Result -> database columns. Prompts are never persisted. */
export function toAuditColumns(
  result: DigitalAuditResult,
): Omit<AuditInsert, "user_id" | "lead_id"> {
  return {
    digital_presence_score: result.digitalPresenceScore,
    conversion_opportunity: result.conversionOpportunity,
    landing_page_opportunity: result.landingPageOpportunity,
    audit_summary: result.auditSummary,
    conversion_problems: result.conversionProblems as unknown as AuditInsert["conversion_problems"],
    recommended_sections:
      result.recommendedSections as unknown as AuditInsert["recommended_sections"],
    evidence: result.evidence as unknown as AuditInsert["evidence"],
  };
}

function isIn<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

function toProblems(value: unknown): AuditConversionProblem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const area = record["area"];
    const severity = record["severity"];
    const problem = record["problem"];
    if (!isIn<AuditProblemArea>(AUDIT_PROBLEM_AREAS, area)) return [];
    if (!isIn<AuditSeverity>(AUDIT_SEVERITIES, severity)) return [];
    if (typeof problem !== "string" || !problem.trim()) return [];
    const source = typeof record["source"] === "string" ? record["source"] : undefined;
    return [{ area, severity, problem, source }];
  });
}

function toSections(value: unknown): AuditRecommendedSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const section = record["section"];
    const justification = record["justification"];
    if (!isIn<AuditSection>(AUDIT_SECTIONS, section)) return [];
    if (typeof justification !== "string" || !justification.trim()) return [];
    return [{ section, justification }];
  });
}

function toEvidence(value: unknown): AnalysisEvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const kind = record["kind"];
    const statement = record["statement"];
    if (kind !== "FACT" && kind !== "INFERENCE" && kind !== "UNKNOWN") return [];
    if (typeof statement !== "string" || !statement.trim()) return [];
    const source = typeof record["source"] === "string" ? record["source"] : undefined;
    return [{ kind: kind as AnalysisStatementKind, statement, source }];
  });
}

/** Database row -> domain object consumed by the UI. */
export function toStoredAudit(row: AuditRow): StoredDigitalAudit {
  return {
    id: row.id,
    leadId: row.lead_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    digitalPresenceScore: row.digital_presence_score,
    conversionOpportunity: row.conversion_opportunity,
    landingPageOpportunity: row.landing_page_opportunity,
    auditSummary: row.audit_summary ?? "",
    conversionProblems: toProblems(row.conversion_problems),
    recommendedSections: toSections(row.recommended_sections),
    evidence: toEvidence(row.evidence),
  };
}
