const DEVICE_KEY_STORAGE = 'tailwatch.device.key'
const DEVICE_NAME_STORAGE = 'tailwatch.device.name'

function randomDeviceKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `device_${crypto.randomUUID()}`
  }
  return `device_${Math.random().toString(36).slice(2, 10)}`
}

function inferBrowserName(userAgent: string) {
  const ua = userAgent.toLowerCase()
  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('opr/') || ua.includes('opera/')) return 'Opera'
  if (ua.includes('chrome/')) return 'Chrome'
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari'
  if (ua.includes('firefox/')) return 'Firefox'
  return 'Browser'
}

function inferPlatformName() {
  if (typeof navigator === 'undefined') return 'Device'

  const userAgentDataPlatform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
  if (typeof userAgentDataPlatform === 'string' && userAgentDataPlatform.trim()) {
    return userAgentDataPlatform.trim()
  }

  const platform = navigator.platform?.trim()
  if (platform) return platform
  return 'Device'
}

function defaultDeviceName() {
  if (typeof navigator === 'undefined') return 'This device'
  const platform = inferPlatformName()
  const browser = inferBrowserName(navigator.userAgent || '')
  return `${platform} · ${browser}`
}

export function getClientDeviceKey() {
  if (typeof window === 'undefined') return 'server'

  const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE)?.trim()
  if (existing) return existing

  const created = randomDeviceKey()
  window.localStorage.setItem(DEVICE_KEY_STORAGE, created)
  return created
}

export function getClientDeviceName() {
  if (typeof window === 'undefined') return 'This device'
  const existing = window.localStorage.getItem(DEVICE_NAME_STORAGE)?.trim()
  if (existing) return existing

  const created = defaultDeviceName()
  window.localStorage.setItem(DEVICE_NAME_STORAGE, created)
  return created
}

export function setClientDeviceName(value: string) {
  if (typeof window === 'undefined') return
  const next = value.trim()
  if (!next) return
  window.localStorage.setItem(DEVICE_NAME_STORAGE, next)
}

