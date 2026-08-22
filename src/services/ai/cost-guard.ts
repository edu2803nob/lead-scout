import { LLM_COST_LIMITS } from "@/config/llm";

import { AIBudgetError } from "./provider";

/**
 * Best-effort in-memory cost control per subject (usually the user id).
 * Hard financial limits must also exist upstream; this protects against
 * accidental loops and naive abuse inside a worker instance.
 */

interface Spend {
  usd: number;
  resetAt: number;
}

const spend = new Map<string, Spend>();

/** Rejects a call whose estimated cost is above the per-call limit. */
export function assertCallCost(estimatedCostUsd: number): void {
  if (estimatedCostUsd > LLM_COST_LIMITS.maxCostPerCallUsd) {
    throw new AIBudgetError("Análise muito grande para o limite de custo por chamada.");
  }
}

/** Rejects when the subject already spent its rolling budget. */
export function assertSubjectBudget(subject: string, now = Date.now()): void {
  const current = spend.get(subject);
  if (!current || current.resetAt <= now) return;
  if (current.usd >= LLM_COST_LIMITS.maxCostPerSubjectUsd) throw new AIBudgetError();
}

/** Records real spend after a successful call. */
export function recordSpend(subject: string, usd: number, now = Date.now()): void {
  const current = spend.get(subject);
  if (!current || current.resetAt <= now) {
    spend.set(subject, { usd, resetAt: now + LLM_COST_LIMITS.windowMs });
    return;
  }
  current.usd += usd;
}

/** Current recorded spend for a subject (0 when the window expired). */
export function getSpend(subject: string, now = Date.now()): number {
  const current = spend.get(subject);
  if (!current || current.resetAt <= now) return 0;
  return current.usd;
}

/** Test helper. */
export function resetSpend(): void {
  spend.clear();
}
