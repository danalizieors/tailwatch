import GitHub from '@auth/core/providers/github'
import { convexAuth, getAuthUserId } from '@convex-dev/auth/server'
import { Auth } from 'convex/server'

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub],
})

export const requireUserId = async (ctx: { auth: Auth }) => {
  const userId = await getAuthUserId(ctx)

  if (!userId) {
    throw new Error('auth_required')
  }

  return userId
}
