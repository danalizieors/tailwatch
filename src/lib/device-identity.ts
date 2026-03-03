import { nanoid } from 'nanoid'
import { UAParser } from 'ua-parser-js'

const DEVICE_KEY_STORAGE = 'tailwatch.device.key'
const DEVICE_NAME_STORAGE = 'tailwatch.device.name'

function randomDeviceKey() {
  return `device_${nanoid(12)}`
}

export function getUAInfo() {
  if (typeof navigator === 'undefined') {
    return { system: 'Device', browser: 'Browser' }
  }
  const parser = new UAParser(navigator.userAgent)
  const result = parser.getResult()
  return {
    system: result.os.name || 'Device',
    browser: result.browser.name || 'Browser',
  }
}

/** @deprecated Use getUAInfo instead */
export function inferBrowserName(userAgent: string) {
  const parser = new UAParser(userAgent)
  return parser.getBrowser().name || 'Browser'
}

/** @deprecated Use getUAInfo instead */
export function inferPlatformName() {
  const { system } = getUAInfo()
  return system
}

function defaultDeviceName() {
  if (typeof navigator === 'undefined') return 'This device'
  const { system, browser } = getUAInfo()
  return `${system} · ${browser}`
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
