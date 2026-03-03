import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Activity, HardDrive, Laptop, LogIn, LogOut, Menu, Terminal, X, PanelLeft, PanelLeftClose } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

type HeaderSection = 'events' | 'volumes' | 'devices'

interface AppShellHeaderProps {
  current?: HeaderSection
  topRight?: ReactNode
  onSidebarToggle?: () => void
  isSidebarOpen?: boolean
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
  topRight,
  onSidebarToggle,
  isSidebarOpen,
}: AppShellHeaderProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

  const navItems: NavItem[] = useMemo(() => {
    return [
      { id: 'events', label: 'Events', href: '/personal', icon: Activity },
      { id: 'volumes', label: 'Volumes', href: '/settings/volumes', icon: HardDrive },
      { id: 'devices', label: 'Devices', href: '/settings/devices', icon: Laptop },
    ]
  }, [])

  return (
    <header 
      className="z-50 shrink-0 border-b border-border/40 bg-background/95 px-3 backdrop-blur-md md:px-8"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
    >
      <div className="flex h-14 items-center justify-between gap-4 md:gap-8">
        <div className="flex items-center gap-6 md:gap-8">
          <Link to="/" className="group relative inline-flex shrink-0 items-center gap-2.5">
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary/20 group-hover:shadow-primary-glow">
              <Terminal className="h-5 w-5" />
            </div>
            <p className="text-base font-black uppercase tracking-tight text-foreground transition-colors group-hover:text-primary">Tailwatch</p>
          </Link>

          <div className="hidden h-5 w-px bg-border/60 md:block" />

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex h-full">
            {navItems.map((item) => {
              const active = current === item.id
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  to={item.href as any}
                  className={cn(
                    'group relative flex items-center gap-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300',
                    active
                      ? 'text-primary'
                      : 'text-zinc-400 hover:text-foreground',
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 relative z-10",
                    active ? "bg-primary/10 shadow-primary-glow-lg ring-1 ring-primary/20" : "group-hover:bg-muted/50"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      active ? "text-primary" : "text-zinc-500 group-hover:text-foreground"
                    )} />
                  </div>
                  <span className={cn("relative z-10 transition-all duration-300", active && "text-primary font-black")}>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2">
            {topRight}
          </div>
          
          {isLoading ? (
            <div className="hidden h-8 w-8 items-center justify-center sm:flex">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent opacity-50" />
            </div>
          ) : isAuthenticated ? (
            <div className="hidden items-center gap-2 md:flex">
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
                <div className="absolute right-0 top-10 z-50 w-52 rounded-md border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur">
                  <div className="border-b border-border/60 px-2 py-2">
                    <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
                    {user?.email ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
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
              onClick={() => void signIn('github')}
              className="hidden gap-1.5 md:flex text-xs font-black uppercase tracking-widest"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Button>
          )}

          {/* Sidebar Toggle (Only if onSidebarToggle is provided) */}
          {onSidebarToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={onSidebarToggle}
              title="Toggle sidebar"
            >
              {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </Button>
          )}

          {/* Hamburger Toggle (Mobile Menu) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2 md:hidden shadow-xl backdrop-blur-lg mb-4">
          {isAuthenticated && user && (
            <div className="flex items-center gap-3 border-b border-border/40 pb-3 px-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/40">
                {user.image ? (
                  <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{avatarInitial}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-widest text-foreground">{displayName}</p>
                {user.email ? <p className="truncate text-xs text-zinc-400">{user.email}</p> : null}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {isAuthenticated ? (
              navItems.map((item) => {
                const Icon = item.icon
                const active = current === item.id
                return (
                  <Link
                    key={item.id}
                    to={item.href as any}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })
            ) : !isLoading && (
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-3 h-11 text-xs font-black uppercase tracking-widest text-primary border-primary/20"
                onClick={() => {
                  setIsMenuOpen(false)
                  void signIn('github')
                }}
              >
                <LogIn className="h-4 w-4" />
                Sign in to access dashboard
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between border-t border-border/40 pt-3 px-1 mt-1">
            <div className="flex items-center gap-3">
              {topRight}
            </div>
            
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-zinc-400 hover:text-destructive hover:bg-destructive/10 h-9 text-xs font-black uppercase tracking-widest"
                onClick={async () => {
                  setIsMenuOpen(false)
                  await signOut()
                  void navigate({ to: '/', replace: true })
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            ) : !isLoading && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsMenuOpen(false)
                  void signIn('github')
                }}
                className="gap-2 h-9 px-4 text-xs font-black uppercase tracking-widest"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
