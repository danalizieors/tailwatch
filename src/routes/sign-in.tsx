import { useAuthActions } from '@convex-dev/auth/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { Github } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { getStoredLastVolumeNameOrDefault } from '~/lib/last-volume'
import { buildNoIndexPageHead } from '~/lib/seo'

export const Route = createFileRoute('/sign-in')({
  head: () =>
    buildNoIndexPageHead({
      title: 'Sign in | Tailwatch',
      description: 'Sign in with GitHub to access your Tailwatch dashboard.',
    }),
  component: SignInPage,
})

function SignInPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const targetVolume = getStoredLastVolumeNameOrDefault()
      void navigate({
        to: '/dashboard/$volumeId',
        params: { volumeId: targetVolume },
        replace: true,
      })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleGitHubSignIn = async () => {
    setIsSubmitting(true)
    try {
      const targetVolume = getStoredLastVolumeNameOrDefault()
      await signIn('github', {
        redirectTo: `/dashboard/${encodeURIComponent(targetVolume)}`,
      })
    } catch (error) {
      console.error('Failed to start GitHub sign in', error)
      setIsSubmitting(false)
    }
  }

  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='mx-auto flex w-full max-w-7xl min-w-0 flex-1 items-center px-4 py-10 sm:px-6 lg:py-16'>
        <Card className='mx-auto w-full max-w-md border-white/10 bg-zinc-900/60'>
          <CardHeader className='space-y-3'>
            <CardTitle className='text-2xl tracking-tight'>Sign in</CardTitle>
            <CardDescription className='leading-relaxed text-zinc-400'>
              Sign in with GitHub to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type='button'
              className='w-full gap-2'
              onClick={() => void handleGitHubSignIn()}
              disabled={isLoading || isSubmitting}
            >
              <Github className='h-3.5 w-3.5' />
              {isLoading || isSubmitting ? 'Redirecting...' : 'Sign in with GitHub'}
            </Button>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </PublicPageShell>
  )
}
