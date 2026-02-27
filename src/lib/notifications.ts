// Sound and PWA/Push management
export class NotificationManager {
  private static audioCtx: AudioContext | null = null
  private static isSoundEnabled = false
  private static lastPushError: string | null = null
  private static readonly pushSubscribePath = '/api/push/subscribe'
  private static readonly pushUnsubscribePath = '/api/push/unsubscribe'
  private static readonly watcherStorageKey = 'tailwatch_watcher_key'
  private static readonly watcherNameStorageKey = 'tailwatch_watcher_name'

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

  static getWatcherKey() {
    if (typeof window === 'undefined') return 'watcher_server'

    const existing = window.localStorage.getItem(this.watcherStorageKey)
    if (existing?.trim()) return existing

    const generated = `watcher_${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(this.watcherStorageKey, generated)
    return generated
  }

  static getWatcherName() {
    if (typeof window === 'undefined') return 'Server Watcher'

    const stored = window.localStorage.getItem(this.watcherNameStorageKey)
    if (stored?.trim()) return stored

    const browser = detectBrowser(window.navigator.userAgent)
    const os = detectOs(window.navigator.userAgent)
    const generated = `${browser} on ${os}`
    window.localStorage.setItem(this.watcherNameStorageKey, generated)
    return generated
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

  static async isPushSubscribed(workspace?: string): Promise<boolean> {
    if (!this.isPushSupported()) return false
    try {
      this.lastPushError = null
      if (window.Notification.permission !== 'granted') {
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (!subscription) return false

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      return this.storePushSubscription(subscription, workspace, vapidPublicKey)
    } catch (error) {
      console.warn('Failed to inspect push subscription', error)
      return false
    }
  }

  // Ensure background push is actually wired when permission is already granted,
  // including auto-repair when the browser dropped an expired/invalid subscription.
  static async ensureBackgroundPush(workspace?: string): Promise<boolean> {
    if (!this.isPushSupported()) return false

    try {
      this.lastPushError = null
      if (window.Notification.permission !== 'granted') {
        return false
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!vapidPublicKey) {
        this.lastPushError = 'Missing VITE_VAPID_PUBLIC_KEY in web app environment.'
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

      return this.storePushSubscription(subscription, workspace, vapidPublicKey)
    } catch (error) {
      console.error('Failed to ensure background push', error)
      this.lastPushError = error instanceof Error ? error.message : 'Failed to ensure background push.'
      return false
    }
  }

  static async enableBackgroundPush(workspace?: string): Promise<boolean> {
    try {
      this.lastPushError = null
      if (!this.isPushSupported()) {
        console.warn('Push API is not supported in this browser')
        this.lastPushError = 'This browser does not support Push API.'
        return false
      }

      const granted = await this.requestPushPermission()
      if (!granted) {
        this.lastPushError = 'Notification permission was not granted.'
        return false
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!vapidPublicKey) {
        console.warn('VITE_VAPID_PUBLIC_KEY is not configured')
        this.lastPushError = 'Missing VITE_VAPID_PUBLIC_KEY in web app environment.'
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

      return this.storePushSubscription(subscription, workspace, vapidPublicKey)
    } catch (error) {
      console.error('Failed to enable background push', error)
      this.lastPushError = error instanceof Error ? error.message : 'Failed to enable background push.'
      return false
    }
  }

  static getLastPushError(): string | null {
    return this.lastPushError
  }

  private static async storePushSubscription(
    subscription: PushSubscription,
    workspace?: string,
    clientVapidPublicKey?: string,
    allowRepair = true,
  ): Promise<boolean> {
    const response = await fetch(this.pushSubscribePath, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
        'x-tailwatch-watcher-key': this.getWatcherKey(),
        'x-tailwatch-watcher-name': this.getWatcherName(),
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        ...(clientVapidPublicKey ? { vapidPublicKey: clientVapidPublicKey } : {}),
      }),
    })

    if (!response.ok) {
      const detail = await safeReadText(response)
      console.error('Failed to store push subscription', detail)
      this.lastPushError = formatPushSubscribeHttpError(response.status, detail)
      return false
    }

    const parsed = await safeReadJson<{
      ok?: boolean
      pushConfigured?: boolean
      missingConfig?: string[]
      serverVapidPublicKey?: string
    }>(response)
    const backendMode = response.headers.get('x-tailwatch-backend')

    if (parsed?.ok === false) {
      console.error('Push subscription was rejected by the server')
      this.lastPushError = 'Push subscription was rejected by the server.'
      return false
    }

    if (parsed?.pushConfigured === false) {
      const missingConfig = parsed.missingConfig ?? []
      const canRepairKeyMismatch =
        allowRepair &&
        missingConfig.includes('VAPID_PUBLIC_KEY_MISMATCH') &&
        typeof parsed.serverVapidPublicKey === 'string' &&
        parsed.serverVapidPublicKey.length > 0

      if (canRepairKeyMismatch) {
        try {
          await subscription.unsubscribe().catch(() => undefined)
          const reg = await navigator.serviceWorker.ready
          const repairedSubscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(parsed.serverVapidPublicKey!),
          })
          return this.storePushSubscription(repairedSubscription, workspace, parsed.serverVapidPublicKey, false)
        } catch (repairError) {
          console.error('Failed to repair push subscription with server VAPID key', repairError)
          this.lastPushError = 'Push key mismatch detected, but automatic re-subscribe failed.'
        }
      }

      console.warn('Push subscription saved, but server delivery is not configured', parsed.missingConfig ?? [])
      this.lastPushError = formatPushConfigError(parsed.missingConfig, backendMode)
      return false
    }

    this.lastPushError = null
    return true
  }

  static async disableBackgroundPush(workspace?: string): Promise<boolean> {
    try {
      if (!this.isPushSupported()) return false

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      const endpoint = subscription?.endpoint
      const watcherKey = this.getWatcherKey()
      const [serverResult] = await Promise.allSettled([
        fetch(this.pushUnsubscribePath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
          },
          body: JSON.stringify({ endpoint, watcherKey }),
        }),
        subscription ? subscription.unsubscribe() : Promise.resolve(true),
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

async function safeReadJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.clone().json()) as T
  } catch {
    return null
  }
}

function formatPushConfigError(missingConfig?: string[], backendMode?: string | null): string {
  const items = missingConfig ?? []
  if (backendMode === 'local') {
    return 'Push backend is in local mode. Configure CONVEX_URL/VITE_CONVEX_URL on the server runtime.'
  }
  if (items.length === 0) {
    return 'Push subscription saved, but server delivery is not configured.'
  }
  if (items.includes('VAPID_PUBLIC_KEY_MISMATCH')) {
    return 'Client/server VAPID public keys do not match.'
  }
  if (items.includes('INVALID_VAPID_KEY_CONFIGURATION')) {
    return 'VAPID keys are set but not a valid key pair/format.'
  }
  return `Missing push config: ${items.join(', ')}.`
}

function formatPushSubscribeHttpError(status: number, detail: string): string {
  const parsed = parseServerErrorText(detail)
  if (parsed) return `Failed to save push subscription: ${parsed}`
  return `Failed to save push subscription (${status}).`
}

function parseServerErrorText(detail: string): string | null {
  const trimmed = detail.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown }
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim()
    }
  } catch {
    // Non-JSON response body
  }
  return trimmed.slice(0, 300)
}

function detectBrowser(userAgent: string) {
  if (userAgent.includes('Edg/')) return 'Edge'
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Safari/')) return 'Safari'
  return 'Browser'
}

function detectOs(userAgent: string) {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS X')) return 'macOS'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
  if (userAgent.includes('Linux')) return 'Linux'
  return 'Unknown OS'
}

export function getClientWatcherKey() {
  return NotificationManager.getWatcherKey()
}

export function getClientWatcherName() {
  return NotificationManager.getWatcherName()
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
