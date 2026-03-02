import { Bell, BellOff, HardDrive, Info, Laptop, Smartphone, Monitor, Key, Globe, Compass, Terminal, Command, Layout } from 'lucide-react'
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
}: VolumeSidebarProps) {
  const sortedDevices = [...(devices ?? [])].sort((a, b) => {
    if (a.isCurrent) return -1
    if (b.isCurrent) return 1
    return (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '')
  })

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-[60] w-[260px] flex-col gap-8 border-r border-border/40 bg-background px-6 py-6 transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:flex lg:translate-x-0 overflow-y-auto no-scrollbar",
      isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
    )}>
      {/* VOLUMES SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center px-1">
          <HardDrive className="h-4 w-4 text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground ml-2">Volumes</h3>
        </div>

        <nav className="flex flex-col gap-2">
          {volumeChoices.map((vol) => {
            const isActive = activeVolume === vol.name
            const color = getPathColor(vol.name)
            
            return (
              <div 
                key={vol.name} 
                className={cn(
                  "group relative flex items-center gap-1 p-1 rounded-2xl transition-all duration-200 border border-transparent",
                  isActive ? "bg-card border-border/40 shadow-sm ring-1 ring-primary/5" : "hover:bg-muted/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => onVolumeChange(vol.name)}
                  className="flex-1 flex items-center gap-3 p-1.5 text-left min-w-0"
                >
                  {/* Visual Marker */}
                  <div 
                    className="h-8 w-1.5 rounded-full shrink-0 transition-all duration-300 group-hover:scale-y-110"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: isActive ? `0 0 16px ${color}66` : undefined
                    }}
                  />
                  
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-wider truncate leading-none mb-1",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
                    )}>
                      {vol.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-muted-foreground/40 group-hover:text-muted-foreground/60">
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
                    'h-8 w-8 shrink-0 rounded-xl transition-all duration-200',
                    vol.notificationsEnabled 
                      ? 'text-primary bg-primary/5 shadow-sm border border-primary/20' 
                      : 'text-muted-foreground/20 hover:text-muted-foreground/60 hover:bg-muted/50'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVolumeNotifications(vol.id, !vol.notificationsEnabled);
                  }}
                  title={vol.notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                >
                   {vol.notificationsEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground ml-2">Devices</h3>
          </div>

          <div className="flex flex-col gap-2">
            {!devices ? (
               <div className="px-2 space-y-2">
                 {[1, 2].map(i => (
                    <div key={i} className="h-10 rounded-xl bg-muted/20 animate-pulse" />
                 ))}
               </div>
            ) : devices.length === 0 ? (
              <p className="px-2 text-[10px] font-medium text-muted-foreground/50 italic">No devices registered</p>
            ) : (
              sortedDevices.map((device) => {
                const OSIcon = getOSIcon(device.os);
                const BrowserIcon = getBrowserIcon(device.browser);
                const color = getPathColor(device.name + (device.id || ''));
                
                return (
                  <div 
                    key={String(device.id)} 
                    className={cn(
                      "group relative flex items-center gap-1 p-1 rounded-2xl transition-all duration-200 border border-transparent",
                      device.isCurrent ? "bg-card border-border/40 shadow-sm ring-1 ring-primary/5" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex-1 flex items-center gap-3 p-1.5 text-left min-w-0">
                      {/* Visual Marker for Device */}
                      <div 
                        className="h-8 w-1 rounded-full shrink-0 transition-all duration-300 group-hover:scale-y-110"
                        style={{ 
                          backgroundColor: color,
                          boxShadow: device.isCurrent ? `0 0 12px ${color}44` : undefined
                        }}
                      />

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 shrink-0 mr-1">
                            <OSIcon className="h-3 w-3 text-muted-foreground/40" title={device.os} />
                            <BrowserIcon className="h-3 w-3 text-muted-foreground/40" title={device.browser} />
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider truncate leading-none",
                            device.isCurrent ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {device.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {device.isCurrent ? (
                            <span className="text-[8px] font-black text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded-[4px] uppercase tracking-tighter border border-primary/20">You</span>
                          ) : (
                            <span className="text-[9px] font-bold text-muted-foreground/30">
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
                        'h-8 w-8 shrink-0 rounded-xl transition-all duration-200',
                        device.enabled 
                          ? 'text-primary bg-primary/5 shadow-sm border border-primary/20' 
                          : 'text-muted-foreground/20 hover:text-muted-foreground/60 hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDeviceMute(device.id, !device.enabled);
                      }}
                      title={device.enabled ? 'Mute device' : 'Unmute device'}
                    >
                       {device.enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
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
          <div className="flex items-start gap-2 text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p className="text-[10px] font-medium leading-relaxed">
              Sign in to manage custom volumes and device alerts.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
