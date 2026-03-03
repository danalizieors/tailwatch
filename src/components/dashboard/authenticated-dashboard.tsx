import { useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect, type ReactNode } from 'react'

interface AuthenticatedDashboardProps {
  children: ReactNode
}

export function AuthenticatedDashboard({
  children,
}: AuthenticatedDashboardProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: '/', replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className='bg-background text-muted-foreground flex min-h-dvh w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent' />
          <p className='animate-pulse text-sm font-medium'>
            Checking session...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
