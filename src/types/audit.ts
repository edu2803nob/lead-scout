import type { AuditProblemArea, AuditSection, AuditSeverity } from "@/config/digital-audit";
import type { AnalysisEvidenceItem } from "@/types/analysis";

/**
 * Domain types for the Digital Audit.
 *
 * Scores are deterministic (they come from the scoring / opportunity engines);
 * the LLM only interprets the observed data into problems, sections and
 * classified evidence (FACT / INFERENCE / UNKNOWN).
 */

export interface AuditConversionProblem {
  area: AuditProblemArea;
  severity: AuditSeverity;
  problem: string;
  /** Which observed field supports it, when applicable. */
  source?: string | undefined;
}

export interface AuditRecommendedSection {
  section: AuditSection;
  justification: string;
}

export interface DigitalAuditResult {
  /** 0-100, deterministic. */
  digitalPresenceScore: number;
  /** 0-100, deterministic. */
  conversionOpportunity: number;
  /** 0-100, deterministic. */
  landingPageOpportunity: number;
  auditSummary: string;
  conversionProblems: AuditConversionProblem[];
  recommendedSections: AuditRecommendedSection[];
  evidence: AnalysisEvidenceItem[];
}

/** Stored audit as returned to the UI. */
export interface StoredDigitalAudit extends DigitalAuditResult {
  id: string;
  leadId: string;
  createdAt: string;
  updatedAt: string;
}
