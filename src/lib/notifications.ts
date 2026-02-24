// Sound and PWA/Push management
export class NotificationManager {
  private static audioCtx: AudioContext | null = null
  private static isSoundEnabled = false

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

  static async requestPushPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    const permission = await window.Notification.requestPermission()
    return permission === 'granted'
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
