import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getAuthenticatedContext(ctx: QueryCtx | MutationCtx) {
  // 1. Check if it's an internal admin call with the secret header
  // Note: headers() is only available in HTTP actions in Convex, 
  // but for standard queries we can't see the headers directly.
  // We'll rely on the standard auth check for browser calls.
  
  const userId = await auth.getUserId(ctx);
  if (userId !== null) {
    return { ...ctx, userId };
  }

  // 2. Fallback for server-to-server calls (like from TanStack Start API routes)
  // We check if a special bypass is active.
  // In Convex, we can use environment variables.
  // If we are in a production environment and no user is found, we deny access
  // unless we implement a custom bypass.
  
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
