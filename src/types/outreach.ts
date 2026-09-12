import type { OutreachStyle } from "@/config/outreach";

/**
 * Domain types for the AI-assisted outreach generator.
 *
 * Every message is a suggestion for human review. Nothing is dispatched by the
 * application, and the message text may only use real observed information.
 */

export interface OutreachMessageResult {
  style: OutreachStyle;
  message: string;
  /** Why this message fits this lead, based on the observed data. */
  reason: string;
}

export interface StoredOutreachMessage extends OutreachMessageResult {
  id: string;
  leadId: string;
  /** Groups the messages generated together. */
  batchId: string;
  /** True when a human edited the suggested text. */
  isEdited: boolean;
  /** Set when the user marked the message as used (registered in the history). */
  usedAt: string | null;
  provider: string;
  model: string;
  businessProfile: string | null;
  createdAt: string;
  updatedAt: string;
}
