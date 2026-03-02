import { Bell, BellOff, HardDrive, Info, Laptop, Smartphone, Monitor, Key, Globe, Compass, Terminal, Command, Layout, X } from 'lucide-react'
import { cn, getPathColor } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { formatRelative } from '~/lib/format'

interface VolumeSidebarProps {
  activeVolume: string
  volumeChoices: Array<{ name: string; notificationsEnabled: boolean; id: any; key?: string }>
  onVolumeChange: (volume: string) => void
  onToggleVolumeNotifications: (volumeId: any, enabled: boolean) => void
  isAuthenticated: boolean
  devices?: Array<{
    id: any
    name: string
    isCurrent: boolean
    enabled: boolean
    lastSeenAt?: string
    os?: string
    browser?: string
  }>
  onToggleDeviceMute: (deviceId: any, enabled: boolean) => void
  isOpen?: boolean
  onClose?: () => void
}

function getOSIcon(os?: string) {
  const name = os?.toLowerCase() || ''
  if (name.includes('win')) return Layout
  if (name.includes('mac') || name.includes('ios') || name.includes('iphone') || name.includes('ipad')) return Command
  if (name.includes('linux') || name.includes('android')) return Terminal
  return Monitor
}

function getBrowserIcon(browser?: string) {
  const name = browser?.toLowerCase() || ''
  if (name.includes('safari')) return Compass
  return Globe
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
    return (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '')
  })

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-[60] w-[280px] flex flex-col gap-8 border-r border-border/40 bg-background/95 backdrop-blur-xl px-6 py-6 transition-all duration-300 ease-in-out lg:static lg:inset-auto lg:flex lg:translate-x-0 overflow-y-auto no-scrollbar",
      isOpen ? "translate-x-0 shadow-2xl opacity-100" : "-translate-x-full opacity-0 lg:opacity-100"
    )}>
      {/* Mobile Close Button */}
      <div className="flex items-center justify-between lg:hidden mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Terminal className="h-4 w-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-foreground">Menu</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -mr-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* VOLUMES SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center px-1">
          <HardDrive className="h-4 w-4 text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-2">Volumes</h3>
        </div>

        <nav className="flex flex-col gap-2">
          {volumeChoices.map((vol) => {
            const isActive = activeVolume === vol.name
            const color = getPathColor(vol.name)
            
            return (
              <div 
                key={vol.name} 
                className={cn(
                  "group relative flex items-center gap-1 p-1.5 rounded-2xl transition-all duration-300 border",
                  isActive 
                    ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_-5px_rgba(var(--primary-rgb),0.2)] ring-1 ring-primary/20" 
                    : "border-transparent hover:bg-muted/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => onVolumeChange(vol.name)}
                  className="flex-1 flex items-center gap-3 p-1 text-left min-w-0"
                >
                  {/* Visual Marker */}
                  <div 
                    className={cn(
                      "h-10 w-1.5 rounded-full shrink-0 transition-all duration-500",
                      isActive ? "scale-y-100" : "scale-y-50 group-hover:scale-y-75"
                    )}
                    style={{ 
                      backgroundColor: color,
                      boxShadow: isActive ? `0 0 20px ${color}` : undefined
                    }}
                  />
                  
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-[0.1em] truncate leading-none mb-1.5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {vol.name}
                    </span>
                    <div className={cn(
                      "flex items-center gap-1.5 transition-colors",
                      isActive ? "text-primary/60" : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
                    )}>
                      <span className="text-[9px] font-mono font-bold tracking-tighter truncate">
                        {vol.key || 'no_key'}
                      </span>
                    </div>
                  </div>
                </button>

                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'h-9 w-9 shrink-0 rounded-xl transition-all duration-200',
                    vol.notificationsEnabled 
                      ? 'text-primary bg-primary/10 shadow-sm border border-primary/30' 
                      : 'text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-muted/50'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVolumeNotifications(vol.id, !vol.notificationsEnabled);
                  }}
                  title={vol.notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                >
                   {vol.notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </Button>
              </div>
            )
          })}
        </nav>
      </div>

      {/* DEVICES SECTION */}
      {isAuthenticated && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center px-1">
            <Laptop className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-2">Devices</h3>
          </div>

          <div className="flex flex-col gap-2">
            {!devices ? (
               <div className="px-2 space-y-2">
                 {[1, 2].map(i => (
                    <div key={i} className="h-10 rounded-xl bg-muted/20 animate-pulse" />
                 ))}
               </div>
            ) : devices.length === 0 ? (
              <p className="px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">No devices</p>
            ) : (
              sortedDevices.map((device) => {
                const OSIcon = getOSIcon(device.os);
                const BrowserIcon = getBrowserIcon(device.browser);
                const color = getPathColor(device.name + (device.id || ''));
                
                return (
                  <div 
                    key={String(device.id)} 
                    className={cn(
                      "group relative flex items-center gap-1 p-1.5 rounded-2xl transition-all duration-300 border",
                      device.isCurrent 
                        ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_-5px_rgba(var(--primary-rgb),0.2)] ring-1 ring-primary/20" 
                        : "border-transparent hover:bg-muted/30"
                    )}
                  >
                    <div className="flex-1 flex items-center gap-3 p-1 text-left min-w-0">
                      {/* Visual Marker for Device */}
                      <div 
                        className={cn(
                          "h-10 w-1.5 rounded-full shrink-0 transition-all duration-500",
                          device.isCurrent ? "scale-y-100" : "scale-y-50 group-hover:scale-y-75"
                        )}
                        style={{ 
                          backgroundColor: color,
                          boxShadow: device.isCurrent ? `0 0 20px ${color}` : undefined
                        }}
                      />                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 shrink-0 mr-1">
                            <OSIcon className="h-3 w-3 text-muted-foreground/60" title={device.os} />
                            <BrowserIcon className="h-3 w-3 text-muted-foreground/60" title={device.browser} />
                          </div>
                          <span className={cn(
                            "text-[11px] font-black uppercase tracking-[0.1em] truncate leading-none transition-colors",
                            device.isCurrent ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            {device.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 transition-colors">
                          {device.isCurrent ? (
                            <span className="text-[8px] font-black text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-[4px] uppercase tracking-tighter border border-primary/20">You</span>
                          ) : (
                            <span className="text-[9px] font-bold text-muted-foreground/60 group-hover:text-muted-foreground/80">
                              {device.lastSeenAt ? formatRelative(device.lastSeenAt) : 'never seen'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-9 w-9 shrink-0 rounded-xl transition-all duration-200',
                        device.enabled 
                          ? 'text-primary bg-primary/10 shadow-sm border border-primary/30' 
                          : 'text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDeviceMute(device.id, !device.enabled);
                      }}
                      title={device.enabled ? 'Mute device' : 'Unmute device'}
                    >
                       {device.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="mt-auto rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
          <div className="flex items-start gap-2 text-muted-foreground/80">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Sign in to manage custom volumes and device alerts.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
