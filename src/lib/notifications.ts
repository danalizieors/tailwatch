import {
  getClientDeviceKey as getIdentityDeviceKey,
  getClientDeviceName as getIdentityDeviceName,
} from './device-identity'

const SEEN_KEY = 'tailwatch_last_seen'

export class NotificationManager {
  private static audioCtx: AudioContext | null = null
  private static isSoundEnabled = false
  private static lastPushError: string | null = null

  static enableSound() {
    if (typeof window === 'undefined') return
    this.isSoundEnabled = true
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

  static getDeviceKey() {
    return getIdentityDeviceKey()
  }

  static getDeviceName() {
    return getIdentityDeviceName()
  }

  static playBeep() {
    if (typeof window === 'undefined' || !this.isSoundEnabled) return

    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as Window & {
              webkitAudioContext?: typeof AudioContext
            }
          ).webkitAudioContext
        if (!AudioContextClass) return
        this.audioCtx = new AudioContextClass()
      }

      const oscillator = this.audioCtx.createOscillator()
      const gainNode = this.audioCtx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime)
      oscillator.connect(gainNode)
      gainNode.connect(this.audioCtx.destination)

      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime)
      gainNode.gain.linearRampToValueAtTime(
        0.05,
        this.audioCtx.currentTime + 0.01,
      )
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        this.audioCtx.currentTime + 0.3,
      )

      oscillator.start(this.audioCtx.currentTime)
      oscillator.stop(this.audioCtx.currentTime + 0.3)
    } catch (error) {
      console.warn('Failed to play beep', error)
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

  static async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window))
      return false
    if (window.Notification.permission === 'granted') return true
    const permission = await window.Notification.requestPermission()
    return permission === 'granted'
  }

  static async ensureBackgroundPush(): Promise<boolean> {
    if (!this.isPushSupported()) return false

    try {
      this.lastPushError = null
      if (window.Notification.permission !== 'granted') {
        this.lastPushError = 'Notification permission not granted.'
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) return true

      const key = getWebPushPublicKey()
      if (!key) {
        this.lastPushError =
          'Web Push Public Key is missing in client configuration.'
        return false
      }

      await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(key),
      })
      return true
    } catch (error) {
      this.lastPushError =
        error instanceof Error
          ? `Browser Error: ${error.message}`
          : 'Failed to create push subscription.'
      return false
    }
  }

  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null
    try {
      const reg = await navigator.serviceWorker.ready
      return await reg.pushManager.getSubscription()
    } catch {
      return null
    }
  }

  static async enableBackgroundPush(): Promise<boolean> {
    if (!this.isPushSupported()) {
      this.lastPushError = 'Push API is not supported in this browser.'
      return false
    }

    const granted = await this.requestPushPermission()
    if (!granted) {
      this.lastPushError = 'Notification permission was not granted.'
      return false
    }

    return this.ensureBackgroundPush()
  }

  static async disableBackgroundPush(): Promise<boolean> {
    if (!this.isPushSupported()) return false

    try {
      this.lastPushError = null
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (!subscription) return true
      await subscription.unsubscribe()
      return true
    } catch (error) {
      this.lastPushError =
        error instanceof Error
          ? error.message
          : 'Failed to disable push subscription.'
      return false
    }
  }

  static getLastPushError() {
    return this.lastPushError
  }
}

function getWebPushPublicKey() {
  return (
    (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined) ??
    (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)
  )
}

function base64UrlToUint8Array(value: string) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }
  return bytes
}

export function getClientDeviceKey() {
  return NotificationManager.getDeviceKey()
}

export function getClientDeviceName() {
  return NotificationManager.getDeviceName()
}

export function getLastSeenTimestamp(): number {
  if (typeof window === 'undefined') return 0
  const stored = window.localStorage.getItem(SEEN_KEY)
  return stored ? Number.parseInt(stored, 10) || 0 : 0
}

export function setLastSeenTimestamp(timestamp: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_KEY, String(timestamp))
}
