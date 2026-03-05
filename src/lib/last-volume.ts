const LAST_VOLUME_KEY = 'tailwatch_last_open_volume'
const DEFAULT_VOLUME = 'personal'

export type ManagedVolumeLike = {
  name: string
  isDefault?: boolean
  key?: {
    value?: string
  }
}

export function normalizeVolumeToken(value?: string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.includes('/')) return null
  return trimmed
}

export function getStoredLastVolumeName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return normalizeVolumeToken(window.localStorage.getItem(LAST_VOLUME_KEY))
  } catch {
    return null
  }
}

export function setStoredLastVolumeName(value?: string | null) {
  if (typeof window === 'undefined') return
  try {
    const normalized = normalizeVolumeToken(value)
    if (!normalized) {
      window.localStorage.removeItem(LAST_VOLUME_KEY)
      return
    }
    window.localStorage.setItem(LAST_VOLUME_KEY, normalized)
  } catch {
    // Ignore storage failures (private mode / quota / permissions).
  }
}

export function findManagedVolumeByToken<T extends ManagedVolumeLike>(
  managedVolumes: readonly T[],
  token?: string | null,
): T | undefined {
  const normalizedToken = normalizeVolumeToken(token)
  if (!normalizedToken) return undefined

  return (
    managedVolumes.find(
      (row) => normalizeVolumeToken(row.name) === normalizedToken,
    ) ??
    managedVolumes.find(
      (row) => normalizeVolumeToken(row.key?.value) === normalizedToken,
    ) ??
    (normalizedToken === DEFAULT_VOLUME
      ? managedVolumes.find((row) => row.isDefault)
      : undefined)
  )
}

export function resolveManagedVolumeName(
  managedVolumes: readonly ManagedVolumeLike[],
  preferredToken?: string | null,
): string {
  const matched = findManagedVolumeByToken(managedVolumes, preferredToken)
  if (matched) {
    return normalizeVolumeToken(matched.name) ?? DEFAULT_VOLUME
  }

  const fallback =
    managedVolumes.find((row) => row.isDefault) ??
    managedVolumes.find((row) => normalizeVolumeToken(row.name) === DEFAULT_VOLUME) ??
    managedVolumes[0]

  return normalizeVolumeToken(fallback?.name) ?? DEFAULT_VOLUME
}

export function getStoredLastVolumeNameOrDefault() {
  return getStoredLastVolumeName() ?? DEFAULT_VOLUME
}
