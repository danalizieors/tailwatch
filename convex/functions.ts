import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getAuthenticatedContext(ctx: QueryCtx | MutationCtx) {
  // 1. Check for valid user session
  const userId = await auth.getUserId(ctx);
  if (userId !== null) {
    return { ...ctx, userId };
  }

  // 2. Fallback for server-to-server calls (like from TanStack Start API routes)
  // If no admin secret is configured in the environment, we allow access (demo/open mode).
  const adminSecret = process.env.TAILWATCH_ADMIN_SECRET;
  if (!adminSecret) {
    return { ...ctx, userId: null };
  }
  
  // If secret IS configured, we must have been authenticated via secret (checked by caller)
  // or via session (checked above). If we reached here, it means both failed.
  throw new Error("Not authenticated");
}

/**
 * A helper specifically for the internal API routes to bypass auth
 * when a secret is provided in the call arguments.
 */
export function checkAdminSecret(secret: string | undefined) {
  const adminSecret = process.env.TAILWATCH_ADMIN_SECRET;
  if (!adminSecret) {
    // If not configured, we don't allow secret bypass
    return false;
  }
  return secret === adminSecret;
}
