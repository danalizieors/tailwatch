// Sound and PWA/Push management
export class NotificationManager {
  private static audioCtx: AudioContext | null = null
  private static isSoundEnabled = false
  private static readonly pushSubscribePath = '/api/push/subscribe'
  private static readonly pushUnsubscribePath = '/api/push/unsubscribe'

  static enableSound() {
    if (typeof window === 'undefined') return
    this.isSoundEnabled = true
    // Resume audio context if it exists (for Chrome/Safari)
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume()
    }
  }

  static disableSound() {
    this.isSoundEnabled = false
  }

  static isEnabled() {
    return this.isSoundEnabled
  }

  static playBeep() {
    if (typeof window === 'undefined' || !this.isSoundEnabled) return

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return
        this.audioCtx = new AudioContextClass()
      }

      const oscillator = this.audioCtx.createOscillator()
      const gainNode = this.audioCtx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime) // A5
      oscillator.connect(gainNode)
      gainNode.connect(this.audioCtx.destination)

      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.05, this.audioCtx.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.3)

      oscillator.start(this.audioCtx.currentTime)
      oscillator.stop(this.audioCtx.currentTime + 0.3)
    } catch (e) {
      console.warn('Failed to play beep', e)
    }
  }

  static async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this browser')
      return false
    }

    if (window.Notification.permission === 'granted') {
      return true
    }

    try {
      // Modern browsers return a promise
      const permission = await window.Notification.requestPermission()
      console.log('Notification permission status:', permission)
      return permission === 'granted'
    } catch (e) {
      // Fallback for older browsers
      return new Promise((resolve) => {
        window.Notification.requestPermission((permission) => {
          console.log('Notification permission status (callback):', permission)
          resolve(permission === 'granted')
        })
      })
    }
  }

  static isPushSupported() {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    )
  }

  static async isPushSubscribed(): Promise<boolean> {
    if (!this.isPushSupported()) return false
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      return subscription !== null
    } catch (error) {
      console.warn('Failed to inspect push subscription', error)
      return false
    }
  }

  static async enableBackgroundPush(workspace?: string): Promise<boolean> {
    try {
      if (!this.isPushSupported()) {
        console.warn('Push API is not supported in this browser')
        return false
      }

      const granted = await this.requestPushPermission()
      if (!granted) return false

      const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined
      if (!vapidPublicKey) {
        console.warn('VITE_WEB_PUSH_PUBLIC_KEY is not configured')
        return false
      }

      const reg = await navigator.serviceWorker.ready
      let subscription = await reg.pushManager.getSubscription()

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
        })
      }

      const response = await fetch(this.pushSubscribePath, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      })

      if (!response.ok) {
        console.error('Failed to store push subscription', await safeReadText(response))
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to enable background push', error)
      return false
    }
  }

  static async disableBackgroundPush(): Promise<boolean> {
    try {
      if (!this.isPushSupported()) return false

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (!subscription) return true

      const endpoint = subscription.endpoint
      const [serverResult] = await Promise.allSettled([
        fetch(this.pushUnsubscribePath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ endpoint }),
        }),
        subscription.unsubscribe(),
      ])

      if (serverResult.status === 'fulfilled' && !serverResult.value.ok) {
        console.warn('Failed to remove push subscription from server', await safeReadText(serverResult.value))
      }

      return true
    } catch (error) {
      console.error('Failed to disable background push', error)
      return false
    }
  }

  static async showLocalNotification(title: string, body: string) {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      try {
        // Try Service Worker first (preferred for background support)
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) {
            void reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: 'tailwatch-event',
              renotify: true,
            } as any)
            return
          }
        }
        
        // Fallback to standard Notification (works when page is open)
        new window.Notification(title, { body, icon: '/pwa-192x192.png' })
      } catch (e) {
        console.error('Notification failed', e)
        // Final attempt fallback
        new window.Notification(title, { body })
      }
    }
  }
}

function base64UrlToUint8Array(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

async function safeReadText(response: Response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

// Local storage for "seen" state
const SEEN_KEY = 'tailwatch_last_seen'
export function getLastSeenTimestamp(): number {
  if (typeof window === 'undefined') return 0
  const stored = window.localStorage.getItem(SEEN_KEY)
  return stored ? parseInt(stored, 10) : 0
}

export function setLastSeenTimestamp(ts: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_KEY, ts.toString())
}
