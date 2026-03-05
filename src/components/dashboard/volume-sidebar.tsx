import {
  Bell,
  BellOff,
  HardDrive,
  Info,
  Laptop,
  X,
} from 'lucide-react'
import { DeviceBrandIcon } from '~/components/device/device-brand-icon'
import { Button } from '~/components/ui/button'
import { formatRelative, toTimestamp } from '~/lib/format'
import { cn, getPathColor } from '~/lib/utils'

interface VolumeSidebarProps {
  activeVolume: string
  volumeChoices: Array<{
    name: string
    notificationsEnabled: boolean
    id: any
    key?: string
    unreadCount?: number
  }>
  onVolumeChange: (volume: string) => void
  onToggleVolumeNotifications: (volumeId: any, enabled: boolean) => void
  isAuthenticated: boolean
  devices?: Array<{
    id: any
    name: string
    isCurrent: boolean
    enabled: boolean
    lastSeenAt?: string | number
    os?: string
    browser?: string
  }>
  onToggleDeviceMute: (deviceId: any, enabled: boolean) => void
  isOpen?: boolean
  onClose?: () => void
}

export function VolumeSidebar({
  activeVolume,
  volumeChoices,
  onVolumeChange,
  onToggleVolumeNotifications,
  isAuthenticated,
  devices,
  onToggleDeviceMute,
  isOpen = false,
  onClose,
}: VolumeSidebarProps) {
  const sortedDevices = [...(devices ?? [])].sort((a, b) => {
    if (a.isCurrent) return -1
    if (b.isCurrent) return 1

    const bSeen = toTimestamp(b.lastSeenAt) ?? 0
    const aSeen = toTimestamp(a.lastSeenAt) ?? 0
    return bSeen - aSeen
  })

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-[100] flex w-72 flex-col overflow-hidden border-r border-white/5 bg-zinc-900/40 px-6 py-6 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:inset-auto lg:flex lg:translate-x-0',
        isOpen
          ? 'translate-x-0 opacity-100 shadow-2xl'
          : '-translate-x-full opacity-0 lg:opacity-100',
      )}
    >
      {/* Mobile Close Button */}
      <div className='mb-2 flex items-center justify-between lg:hidden'>
        <div className='flex items-center'>
          <span className='text-foreground text-xs font-semibold tracking-wide'>
            Menu
          </span>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='-mr-2 h-8 w-8'
          onClick={onClose}
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pt-4 lg:pt-0'>

        {/* VOLUMES SECTION */}
        <div className='flex flex-col gap-4'>
          <div className='flex items-center gap-2 px-1'>
            <HardDrive className='text-primary h-4 w-4' />
            <span className='text-foreground/70 text-xs font-semibold tracking-wide'>
              Volumes
            </span>
          </div>

          <nav className='flex flex-col gap-2'>
            {volumeChoices.map((vol) => {
              const isActive = activeVolume === vol.name
              const color = getPathColor(vol.name)
              const unreadCount = Math.max(0, vol.unreadCount ?? 0)
              const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount)

              return (
                <div
                  key={vol.name}
                  className={cn(
                    'group relative flex items-center gap-1 rounded-2xl border p-1.5 transition-all duration-300',
                    isActive
                      ? 'bg-primary/10 border-primary/30 shadow-primary-glow-sm ring-primary/20 ring-1'
                      : 'hover:bg-muted/30 border-transparent',
                  )}
                >
                  <button
                    type='button'
                    onClick={() => onVolumeChange(vol.name)}
                    className='flex min-w-0 flex-1 items-center gap-3 p-1 text-left'
                  >
                    {/* Visual Marker */}
                    <div
                      className={cn(
                        'h-10 w-1.5 shrink-0 rounded-full transition-all duration-500',
                        isActive
                          ? 'scale-y-100'
                          : 'scale-y-50 group-hover:scale-y-75',
                      )}
                      style={{
                        backgroundColor: color,
                        boxShadow: isActive ? `0 0 20px ${color}` : undefined,
                      }}
                    />

                    <div className='flex min-w-0 flex-col'>
                      <span
                        className={cn(
                          'mb-1.5 truncate text-xs leading-none font-semibold tracking-wide transition-colors',
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      >
                        {vol.name}
                      </span>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 transition-colors',
                          isActive
                            ? 'text-primary'
                            : 'text-zinc-500 group-hover:text-zinc-400',
                        )}
                      >
                        <span className='text-xxs truncate font-mono font-bold tracking-tighter'>
                          {vol.key || 'no_key'}
                        </span>
                      </div>
                    </div>
                  </button>

                  <Button
                    size='icon'
                    variant='ghost'
                    className={cn(
                      'relative h-9 w-9 shrink-0 rounded-xl transition-all duration-200',
                      vol.notificationsEnabled
                        ? 'text-primary bg-primary/10 border-primary/30 border shadow-sm'
                        : 'hover:bg-muted/50 text-zinc-500 hover:text-zinc-300',
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleVolumeNotifications(
                        vol.id,
                        !vol.notificationsEnabled,
                      )
                    }}
                    title={
                      vol.notificationsEnabled
                        ? 'Disable notifications'
                        : 'Enable notifications'
                    }
                  >
                    {vol.notificationsEnabled ? (
                      <Bell className='h-4 w-4' />
                    ) : (
                      <BellOff className='h-4 w-4' />
                    )}
                    {unreadCount > 0 ? (
                      <span className='bg-primary text-primary-foreground pointer-events-none absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] leading-none font-bold tabular-nums shadow-md'>
                        {unreadLabel}
                      </span>
                    ) : null}
                  </Button>
                </div>
              )
            })}
          </nav>
        </div>

        {/* DEVICES SECTION */}
        {isAuthenticated && (
          <div className='flex flex-col gap-4'>
            <div className='flex items-center gap-2 px-1'>
              <Laptop className='text-primary h-4 w-4' />
              <span className='text-foreground/70 text-xs font-semibold tracking-wide'>
                Devices
              </span>
            </div>

            <div className='flex flex-col gap-2'>
              {!devices ? (
                <div className='space-y-2 px-2'>
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className='bg-muted/20 h-10 animate-pulse rounded-xl'
                    />
                  ))}
                </div>
              ) : devices.length === 0 ? (
                <p className='px-2 text-xs font-medium tracking-wide text-zinc-400 italic'>
                  No devices
                </p>
              ) : (
                sortedDevices.map((device) => {
                  const lastSeenLabel = formatRelative(device.lastSeenAt)
                  const color = getPathColor(device.name + (device.id || ''))

                  return (
                    <div
                      key={String(device.id)}
                      className={cn(
                        'group relative flex items-center gap-1 rounded-2xl border p-1.5 transition-all duration-300',
                        device.isCurrent
                          ? 'bg-primary/10 border-primary/30 shadow-primary-glow-sm ring-primary/20 ring-1'
                          : 'hover:bg-muted/30 border-transparent',
                      )}
                    >
                      <div className='flex min-w-0 flex-1 items-center gap-3 p-1 text-left'>
                        {/* Visual Marker for Device */}
                        <div
                          className={cn(
                            'h-10 w-1.5 shrink-0 rounded-full transition-all duration-500',
                            device.isCurrent
                              ? 'scale-y-100'
                              : 'scale-y-50 group-hover:scale-y-75',
                          )}
                          style={{
                            backgroundColor: color,
                            boxShadow: device.isCurrent
                              ? `0 0 20px ${color}`
                              : undefined,
                          }}
                        />{' '}
                        <div className='flex min-w-0 flex-col'>
                          <span
                            className={cn(
                              'truncate text-xs leading-none font-semibold tracking-wide transition-colors',
                              device.isCurrent
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground',
                            )}
                          >
                            {device.name}
                          </span>
                          <div className='mt-1.5 flex items-center gap-1.5 transition-colors'>
                            {device.isCurrent ? (
                              <span className='text-xxs text-primary bg-primary/10 border-primary/20 rounded border px-1.5 py-0.5 font-semibold tracking-wide'>
                                You
                              </span>
                            ) : (
                              <span className='text-xxs font-bold text-zinc-400 group-hover:text-zinc-300'>
                                {lastSeenLabel === '—'
                                  ? 'never seen'
                                  : lastSeenLabel}
                              </span>
                            )}
                            <div className='ml-1 flex shrink-0 items-center gap-1'>
                              <DeviceBrandIcon
                                kind='os'
                                name={device.os}
                                className='h-3 w-3 text-zinc-400'
                              />
                              <DeviceBrandIcon
                                kind='browser'
                                name={device.browser}
                                className='h-3 w-3 text-zinc-400'
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        size='icon'
                        variant='ghost'
                        className={cn(
                          'h-9 w-9 shrink-0 rounded-xl transition-all duration-200',
                          device.enabled
                            ? 'text-primary bg-primary/10 border-primary/30 border shadow-sm'
                            : 'hover:bg-muted/50 text-zinc-500 hover:text-zinc-300',
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleDeviceMute(device.id, !device.enabled)
                        }}
                        title={device.enabled ? 'Mute device' : 'Unmute device'}
                      >
                        {device.enabled ? (
                          <Bell className='h-4 w-4' />
                        ) : (
                          <BellOff className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {!isAuthenticated && (
        <div className='border-border/60 bg-muted/20 mt-4 rounded-xl border border-dashed p-4'>
          <div className='flex items-start gap-2 text-zinc-300'>
            <Info className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            <p className='text-xs leading-relaxed font-medium tracking-wide'>
              Sign in to manage custom volumes and device alerts.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
