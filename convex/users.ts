import { query } from './_generated/server'
import { auth } from './auth'

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const user = await ctx.db.get(userId)
    if (!user) return null

    return {
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
    }
  },
})
