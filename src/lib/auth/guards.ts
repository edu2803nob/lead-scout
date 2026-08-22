import { createMiddleware } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError } from "@/lib/errors";
import { consumeRateLimit, type RateLimitRule } from "@/lib/security/rate-limit";

/**
 * Authentication / authorization guards for server functions.
 *
 * Rules enforced here:
 * - the session is always validated server-side from the Bearer token;
 * - the user id comes from the verified token claims, never from client input;
 * - admin-only endpoints check the role in the database (`public.has_role`).
 */

export class UnauthorizedError extends AppError {
  constructor(message = "Sessão inválida ou expirada. Entre novamente.") {
    super(message, { code: "UNAUTHORIZED", status: 401 });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message, { code: "FORBIDDEN", status: 403 });
    this.name = "ForbiddenError";
  }
}

/** Session guard: use on every protected server function. */
export const requireAuth = requireSupabaseAuth;

/** Admin guard: session + `admin` role read from the database as the caller. */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error) throw new ForbiddenError();
    if (!data) throw new ForbiddenError();

    return next({ context: { isAdmin: true as const } });
  });

/**
 * Rate-limit guard factory, keyed by the authenticated user id.
 * Must be composed after an auth guard.
 */
export function withRateLimit(rule: RateLimitRule) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      consumeRateLimit(rule, context.userId);
      return next();
    });
}
