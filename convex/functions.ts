import { auth } from "./auth";
import { query, QueryCtx, MutationCtx } from "./_generated/server";

export async function getAuthenticatedContext(ctx: QueryCtx | MutationCtx) {
  // Attach userId when a valid session exists.
  const userId = await auth.getUserId(ctx);
  if (userId !== null) {
    return { ...ctx, userId };
  }

  // Demo/open mode: allow anonymous access and record `userId: null`.
  return { ...ctx, userId: null };
}

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
    };
  },
});
