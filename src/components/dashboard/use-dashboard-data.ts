import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getLastSeenTimestamp,
  setLastSeenTimestamp,
} from '~/lib/notifications'
import type { DashboardSnapshot } from '~/lib/types'
import { api } from '../../../convex/_generated/api'

interface UseDashboardDataOptions {
  mode: 'logs' | 'status'
  volume?: string
  topicPrefix?: string
  isAuthenticated?: boolean
  activeVolumeId?: string
  pollMs?: number
}

export function useDashboardData({
  mode,
  volume,
  topicPrefix,
  isAuthenticated = false,
  activeVolumeId,
  pollMs = 4000,
}: UseDashboardDataOptions) {
  const [error] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSeenAt, setLastSeenAtState] = useState<number>(0)

  // Track the most recent event time seen during this session.
  const lastKnownTsRef = useRef<number>(0)
  const hasInitialLoadRef = useRef(false)

  // Store previous data to avoid flickering when arguments change
  const previousDataRef = useRef<DashboardSnapshot | undefined>(undefined)

  useEffect(() => {
    // Load from localStorage on mount (client-only)
    const initialSeen = getLastSeenTimestamp()
    setLastSeenAtState(initialSeen)
    lastKnownTsRef.current = initialSeen
  }, [])

  const normalizedVolume = volume?.trim() ? volume.trim() : undefined
  const normalizedTopicPrefix = topicPrefix?.trim()
    ? topicPrefix.trim()
    : undefined

  const logsArgs = useMemo(() => {
    const next: Record<string, unknown> = {
      limit: 50,
    }
    if (normalizedVolume) next.volume = normalizedVolume
    if (normalizedTopicPrefix) next.topicPrefix = normalizedTopicPrefix
    return next
  }, [normalizedTopicPrefix, normalizedVolume])

  const statusArgs = useMemo(() => {
    const next: Record<string, unknown> = {
      limit: 200,
    }
    if (normalizedVolume) next.volume = normalizedVolume
    if (normalizedTopicPrefix) next.topicPrefix = normalizedTopicPrefix
    return next
  }, [normalizedTopicPrefix, normalizedVolume])

  const convexApi = api as any
  const logsData = useQuery(
    convexApi.events.dashboardSnapshot,
    mode === 'logs' ? logsArgs : 'skip',
  ) as DashboardSnapshot | undefined
  const statusData = useQuery(
    convexApi.events.statusSnapshot,
    mode === 'status' ? statusArgs : 'skip',
  ) as DashboardSnapshot | undefined
  const markVolumeSeen = useMutation((convexApi as any).events.markVolumeSeen)

  const data = mode === 'status' ? statusData : logsData

  if (data !== undefined) {
    previousDataRef.current = data
  }

  useEffect(() => {
    if (!data) return

    if (data.events && data.events.length > 0) {
      const newest = Math.max(
        ...data.events.map((event) => new Date(event.time).getTime()),
      )

      if (hasInitialLoadRef.current && newest > lastKnownTsRef.current) {
        // New events found, but we no longer play a sound
      }

      lastKnownTsRef.current = newest
    }

    hasInitialLoadRef.current = true
  }, [data])

  const markAllSeen = useCallback(() => {
    // Determine the newest time from current data (events or entity updates).
    let newest = lastSeenAt
    if (data?.events && data.events.length > 0) {
      newest = Math.max(
        newest,
        ...data.events.map((e) => new Date(e.time).getTime()),
      )
    }
    if (data?.entities && data.entities.length > 0) {
      newest = Math.max(
        newest,
        ...data.entities.map((e) => new Date(e.lastSeenAt).getTime()),
      )
    }

    setLastSeenTimestamp(newest)
    setLastSeenAtState(newest)

    if (isAuthenticated && activeVolumeId) {
      void markVolumeSeen({
        volumeId: activeVolumeId,
        seenAt: newest,
      }).catch(() => {
        // Keep local behavior even if syncing fails.
      })
    }
  }, [activeVolumeId, data, isAuthenticated, lastSeenAt, markVolumeSeen])

  const refresh = () => {
    setIsRefreshing(true)
    window.setTimeout(
      () => {
        setIsRefreshing(false)
      },
      Math.min(250, pollMs),
    )
  }

  return {
    data: data ?? previousDataRef.current,
    error,
    isLoading: data === undefined && previousDataRef.current === undefined,
    isRefreshing,
    refresh,
    markAllSeen,
    lastSeenAt,
  }
}
