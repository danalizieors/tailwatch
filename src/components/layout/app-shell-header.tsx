import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { useMemo, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Activity, HardDrive, Laptop, LogIn, LogOut, Terminal } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

type HeaderSection = 'events' | 'volumes' | 'devices'

interface AppShellHeaderProps {
  current?: HeaderSection
  activeVolume?: string
  volumeChoices?: string[]
  showVolumeSelector?: boolean
  onVolumeChange?: (volume: string) => void
  topRight?: ReactNode
  actions?: ReactNode
  eventsTopRow?: ReactNode
  bottomRight?: ReactNode
  belowFilter?: ReactNode
}

type NavItem = {
  id: HeaderSection
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

function currentPathForRedirect() {
  if (typeof window === 'undefined') return '/personal'
  return `${window.location.pathname}${window.location.search}`
}

export function AppShellHeader({
  current,
  activeVolume = 'personal',
  volumeChoices = ['personal'],
  showVolumeSelector = false,
  onVolumeChange,
  topRight,
  actions,
  eventsTopRow,
  bottomRight,
  belowFilter,
}: AppShellHeaderProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const navigate = useNavigate()
  const user = useQuery((api as any).users.currentUser, isAuthenticated ? {} : 'skip') as
    | {
        name?: string | null
        email?: string | null
        image?: string | null
      }
    | null
    | undefined

  const displayName = user?.name?.trim() || user?.email?.trim() || 'User'
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'U'
  const normalizedVolume = activeVolume.trim() || 'personal'
  const logsHref = `/${encodeURIComponent(normalizedVolume)}`
  const eventHref = logsHref

  const navItems: NavItem[] = useMemo(() => {
    return [
      { id: 'events', label: 'Events', href: eventHref, icon: Activity },
      { id: 'volumes', label: 'Volumes', href: '/settings/volumes', icon: HardDrive },
      { id: 'devices', label: 'Devices', href: '/settings/devices', icon: Laptop },
    ]
  }, [eventHref])

  return (
    <header className="z-50 shrink-0 border-b border-border/40 bg-background/90 px-3 py-2 backdrop-blur-md md:px-8">
      <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4">
        <Link to="/" className="group inline-flex shrink-0 items-center gap-2 rounded-lg px-1 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="leading-none">
            <p className="text-sm font-black uppercase tracking-wide text-foreground">Tailwatch</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="no-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto rounded-lg border border-primary/15 bg-primary/5 p-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = current === item.id
            return (
              <Link
                key={item.id}
                to={item.href as any}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                  active
                    ? 'bg-background text-primary border-border/60 shadow-sm'
                    : 'text-muted-foreground/70 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {topRight}
          {isLoading ? (
            <Button type="button" size="sm" variant="outline" disabled>
              Checking session...
            </Button>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <details className="group relative">
                <summary className="list-none cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <div
                    className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/40 text-xs font-bold text-foreground"
                    title={displayName}
                  >
                    {user?.image ? (
                      <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{avatarInitial}</span>
                    )}
                  </div>
                </summary>
                <div className="absolute right-0 top-9 z-50 w-52 rounded-md border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur">
                  <div className="border-b border-border/60 px-2 py-2">
                    <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
                    {user?.email ? <p className="truncate text-[10px] text-muted-foreground">{user.email}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut()
                      void navigate({ to: '/', replace: true })
                    }}
                    className="mt-1 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/80"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </details>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void signIn('github', { redirectTo: currentPathForRedirect() })}
              className="gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Button>
          )}
        </div>
      </div>

      {current === 'events' && eventsTopRow ? <div className="mt-2">{eventsTopRow}</div> : null}

      {current === 'events' && (showVolumeSelector || belowFilter || actions || bottomRight) ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto min-w-0">
            {showVolumeSelector ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-2 py-1 shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">Volume</span>
                <select
                  value={normalizedVolume}
                  onChange={(event) => onVolumeChange?.(event.target.value)}
                  className="h-7 rounded-md border border-border/60 bg-background px-2 text-[11px] font-semibold text-foreground"
                  title="Switch active volume"
                >
                  {volumeChoices.map((name) => (
                    <option key={name} value={name}>
                      {name === 'personal' ? 'personal (default)' : name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {belowFilter}
          </div>

          {(actions || bottomRight) ? (
            <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
              {actions}
              {bottomRight}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
