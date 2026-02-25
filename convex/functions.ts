import { auth } from "./auth";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getAuthenticatedContext(ctx: QueryCtx | MutationCtx) {
  // Attach userId when a valid session exists.
  const userId = await auth.getUserId(ctx);
  if (userId !== null) {
    return { ...ctx, userId };
  }

  // Demo/open mode: allow anonymous access and record `userId: null`.
  return { ...ctx, userId: null };
}
