import { useAuthActions } from '@convex-dev/auth/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import {
  Activity,
  HardDrive,
  Laptop,
  LogIn,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Terminal,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { api } from '../../../convex/_generated/api'

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
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const user = useQuery(
    (api as any).users.currentUser,
    isAuthenticated ? {} : 'skip',
  ) as
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
      {
        id: 'events',
        label: 'Events',
        href: '/personal',
        icon: Activity,
      },
      {
        id: 'volumes',
        label: 'Volumes',
        href: '/settings/volumes',
        icon: HardDrive,
      },
      {
        id: 'devices',
        label: 'Devices',
        href: '/settings/devices',
        icon: Laptop,
      },
    ]
  }, [])

  useEffect(() => {
    if (!isProfileOpen) return
    const handleDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.profile-dropdown-container')) {
        setIsProfileOpen(false)
      }
    }
    window.addEventListener('mousedown', handleDown)
    return () => window.removeEventListener('mousedown', handleDown)
  }, [isProfileOpen])

  return (
    <>
      <header
        className={cn(
          'border-border/40 bg-background/95 z-50 shrink-0 border-b px-3 transition-all duration-500 ease-in-out md:px-8',
          isMenuOpen || isProfileOpen
            ? 'backdrop-blur-none'
            : 'backdrop-blur-md',
        )}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        }}
      >
        <div className='flex h-14 items-center justify-between gap-4 md:gap-8'>
          <div className='flex items-center gap-6 md:gap-8'>
            <Link
              to='/'
              className='group relative inline-flex shrink-0 items-center gap-2.5'
            >
              <div className='border-primary/25 bg-primary/10 text-primary group-hover:border-primary/40 group-hover:bg-primary/20 group-hover:shadow-primary-glow relative z-10 flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-300'>
                <Terminal className='h-5 w-5' />
              </div>
              <p className='text-foreground group-hover:text-primary text-base font-black tracking-tight uppercase transition-colors'>
                Tailwatch
              </p>
            </Link>

            <div className='bg-border/60 hidden h-5 w-px md:block' />

            {/* Desktop Navigation */}
            <nav className='hidden h-full items-center gap-8 md:flex'>
              {navItems.map((item) => {
                const active = current === item.id
                const Icon = item.icon
                return (
                  <Link
                    key={item.id}
                    to={item.href as any}
                    className={cn(
                      'group relative flex items-center gap-2.5 text-xs font-black tracking-widest uppercase transition-all duration-300',
                      active
                        ? 'text-primary'
                        : 'hover:text-foreground text-zinc-400',
                    )}
                  >
                    <div
                      className={cn(
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                        active
                          ? 'bg-primary/10 shadow-primary-glow-lg ring-primary/20 ring-1'
                          : 'group-hover:bg-muted/50',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 transition-colors',
                          active
                            ? 'text-primary'
                            : 'group-hover:text-foreground text-zinc-500',
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'relative z-10 transition-all duration-300',
                        active && 'text-primary font-black',
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className='ml-auto flex shrink-0 items-center gap-2'>
            <div className='flex items-center gap-2'>{topRight}</div>

            {isLoading ? (
              <div className='hidden h-8 w-8 items-center justify-center sm:flex'>
                <div className='border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent opacity-50' />
              </div>
            ) : isAuthenticated ? (
              <div className='hidden items-center gap-2 md:flex'>
                <div className='profile-dropdown-container relative'>
                  <button
                    type='button'
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className='border-border/70 bg-muted/40 hover:bg-muted/60 hover:ring-primary/20 focus:ring-primary/40 flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border transition-all hover:ring-2 focus:ring-2 focus:outline-none'
                  >
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={displayName}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <span className='text-foreground text-xs font-bold'>
                        {avatarInitial}
                      </span>
                    )}
                  </button>

                  <div
                    className={cn(
                      'border-border/70 bg-card/98 absolute top-12 right-0 z-[100] w-64 origin-top-right rounded-xl border p-3 shadow-2xl backdrop-blur-xl transition-all duration-200',
                      isProfileOpen
                        ? 'translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-2 scale-95 opacity-0',
                    )}
                  >
                    <div className='border-border/40 mb-2 flex items-center gap-3 border-b pb-3'>
                      <div className='border-border/70 bg-muted/40 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border'>
                        {user?.image ? (
                          <img
                            src={user.image}
                            alt={displayName}
                            className='h-full w-full object-cover'
                          />
                        ) : (
                          <span className='text-sm font-bold'>
                            {avatarInitial}
                          </span>
                        )}
                      </div>
                      <div className='flex min-w-0 flex-col'>
                        <p className='text-foreground truncate text-xs font-black tracking-widest uppercase'>
                          {displayName}
                        </p>
                        {user?.email ? (
                          <p className='truncate text-xs text-zinc-500'>
                            {user.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type='button'
                      onClick={async () => {
                        setIsProfileOpen(false)
                        await signOut()
                        void navigate({
                          to: '/',
                          replace: true,
                        })
                      }}
                      className='text-foreground hover:bg-destructive/10 hover:text-destructive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black tracking-widest uppercase transition-colors'
                    >
                      <LogOut className='h-3.5 w-3.5' />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => void signIn('github')}
                className='hidden gap-1.5 text-xs font-black tracking-widest uppercase md:flex'
              >
                <LogIn className='h-3.5 w-3.5' />
                Sign in
              </Button>
            )}

            {/* Hamburger Toggle (Mobile Menu) */}
            <Button
              variant='ghost'
              size='icon'
              className='relative h-8 w-8 overflow-hidden md:hidden'
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-all duration-300',
                  isMenuOpen
                    ? 'scale-100 rotate-0 opacity-100'
                    : 'scale-50 rotate-90 opacity-0',
                )}
              >
                <X className='h-5 w-5' />
              </div>
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-all duration-300',
                  isMenuOpen
                    ? 'scale-50 -rotate-90 opacity-0'
                    : 'scale-100 rotate-0 opacity-100',
                )}
              >
                <Menu className='h-5 w-5' />
              </div>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[40] transition-all duration-500 ease-in-out md:hidden',
          isMenuOpen
            ? 'bg-background/20 pointer-events-auto opacity-100 backdrop-blur-sm'
            : 'bg-background/0 pointer-events-none opacity-0 backdrop-blur-none',
        )}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Menu Content */}
      <div
        className={cn(
          'border-primary/20 bg-card/95 absolute top-16 right-4 left-4 z-[50] flex transform-gpu flex-col gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl transition-all duration-500 ease-in-out md:hidden',
          isMenuOpen
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-4 scale-95 opacity-0',
        )}
      >
        {isAuthenticated && user && (
          <div className='border-border/40 flex items-center gap-3 border-b px-1 pb-4'>
            <div className='border-border/70 bg-muted/40 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border'>
              {user.image ? (
                <img
                  src={user.image}
                  alt={displayName}
                  className='h-full w-full object-cover'
                />
              ) : (
                <span className='text-base font-bold'>{avatarInitial}</span>
              )}
            </div>
            <div className='flex min-w-0 flex-col'>
              <p className='text-foreground truncate text-sm font-black tracking-widest uppercase'>
                {displayName}
              </p>
              {user.email ? (
                <p className='truncate text-xs text-zinc-400'>{user.email}</p>
              ) : null}
            </div>
          </div>
        )}

        <div className='flex flex-col gap-1'>
          {isAuthenticated
            ? navItems.map((item) => {
                const Icon = item.icon
                const active = current === item.id
                return (
                  <Link
                    key={item.id}
                    to={item.href as any}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black tracking-widest uppercase transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-primary/20 shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className='h-4 w-4' />
                    {item.label}
                  </Link>
                )
              })
            : !isLoading && (
                <Button
                  variant='outline'
                  size='sm'
                  className='text-primary border-primary/20 h-11 justify-start gap-3 text-xs font-black tracking-widest uppercase'
                  onClick={() => {
                    setIsMenuOpen(false)
                    void signIn('github')
                  }}
                >
                  <LogIn className='h-4 w-4' />
                  Sign in to access dashboard
                </Button>
              )}
        </div>

        <div className='border-border/40 mt-1 flex items-center justify-between border-t px-1 pt-3'>
          <div className='flex items-center gap-3'>{topRight}</div>

          {isAuthenticated ? (
            <Button
              variant='ghost'
              size='sm'
              className='hover:text-destructive hover:bg-destructive/10 h-9 gap-2 text-xs font-black tracking-widest text-zinc-400 uppercase'
              onClick={async () => {
                setIsMenuOpen(false)
                await signOut()
                void navigate({ to: '/', replace: true })
              }}
            >
              <LogOut className='h-4 w-4' />
              <span>Sign out</span>
            </Button>
          ) : (
            !isLoading && (
              <Button
                type='button'
                size='sm'
                onClick={() => {
                  setIsMenuOpen(false)
                  void signIn('github')
                }}
                className='h-9 gap-2 px-4 text-xs font-black tracking-widest uppercase'
              >
                <LogIn className='h-4 w-4' />
                <span>Sign in</span>
              </Button>
            )
          )}
        </div>
      </div>
    </>
  )
}
