import { z } from "zod";

import { AIInvalidResponseError } from "./provider";

/**
 * Extracts and validates a JSON object from raw model output.
 * Any output that is not a schema-conforming JSON object is rejected.
 */

/** Pulls the first balanced JSON object out of the text (handles code fences). */
export function extractJsonObject(raw: string): string {
  const text = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = text.indexOf("{");
  if (start === -1) throw new AIInvalidResponseError("NOT_JSON", "no object start");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  throw new AIInvalidResponseError("TRUNCATED", "unbalanced object");
}

/** Parses + schema-validates model output; throws `AIInvalidResponseError`. */
export function parseStructuredResponse<S extends z.ZodTypeAny>(
  schema: S,
  raw: string,
): z.output<S> {
  if (!raw || raw.trim().length === 0) throw new AIInvalidResponseError("EMPTY", "empty output");

  const json = extractJsonObject(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AIInvalidResponseError("NOT_JSON", "json parse failed");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AIInvalidResponseError("UNEXPECTED_CONTENT", "root is not an object");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path.join(".") || "_").join(",");
    throw new AIInvalidResponseError("SCHEMA_MISMATCH", `invalid fields: ${paths}`);
  }

  return result.data;
}
