import { SignJWT } from 'jose'
import { getProcessEnv } from '~/lib/server/runtime-env'

type VapidSigner = {
  publicKey: string
  subject: string
  privateCryptoKey: CryptoKey
}

export interface WebPushSendResult {
  ok: boolean
  status?: number
  skipped?: boolean
  error?: string
}

let signerPromise: Promise<VapidSigner | null> | null = null

export function isWebPushConfigured() {
  return Boolean(
    getProcessEnv('WEB_PUSH_VAPID_PUBLIC_KEY') &&
      getProcessEnv('WEB_PUSH_VAPID_PRIVATE_KEY') &&
      getProcessEnv('WEB_PUSH_VAPID_SUBJECT'),
  )
}

export async function sendWebPushWake(endpoint: string): Promise<WebPushSendResult> {
  const signer = await getVapidSigner()
  if (!signer) {
    return {
      ok: false,
      skipped: true,
      error: 'Web push not configured',
    }
  }

  let audience: string
  try {
    audience = new URL(endpoint).origin
  } catch {
    return { ok: false, error: 'Invalid push endpoint URL' }
  }

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(audience)
    .setSubject(signer.subject)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(signer.privateCryptoKey)

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        TTL: '60',
        Urgency: 'high',
        Authorization: `vapid t=${jwt}, k=${signer.publicKey}`,
        'Crypto-Key': `p256ecdsa=${signer.publicKey}`,
      },
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Push request failed',
    }
  }

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
    }
  }

  return {
    ok: false,
    status: response.status,
    error: await safeText(response),
  }
}

async function getVapidSigner(): Promise<VapidSigner | null> {
  if (!signerPromise) {
    signerPromise = createVapidSigner()
  }
  return signerPromise
}

async function createVapidSigner(): Promise<VapidSigner | null> {
  const publicKey = getProcessEnv('WEB_PUSH_VAPID_PUBLIC_KEY')
  const privateKey = getProcessEnv('WEB_PUSH_VAPID_PRIVATE_KEY')
  const subject = getProcessEnv('WEB_PUSH_VAPID_SUBJECT')

  if (!publicKey || !privateKey || !subject) {
    return null
  }

  const publicBytes = base64UrlToBytes(publicKey)
  const privateBytes = base64UrlToBytes(privateKey)

  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error('WEB_PUSH_VAPID_PUBLIC_KEY must be an uncompressed P-256 public key (base64url)')
  }
  if (privateBytes.length !== 32) {
    throw new Error('WEB_PUSH_VAPID_PRIVATE_KEY must be a 32-byte P-256 private key (base64url)')
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto subtle API is not available')
  }

  const x = publicBytes.slice(1, 33)
  const y = publicBytes.slice(33, 65)
  const d = privateBytes

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(x),
    y: bytesToBase64Url(y),
    d: bytesToBase64Url(d),
    ext: false,
    key_ops: ['sign'],
  }

  const privateCryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  return {
    publicKey,
    subject,
    privateCryptoKey,
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  if (typeof atob !== 'function') {
    throw new Error('Base64 decode is not available in this runtime')
  }
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join('')
  if (typeof btoa !== 'function') {
    throw new Error('Base64 encode is not available in this runtime')
  }
  const encoded = btoa(binary)
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function safeText(response: Response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}
