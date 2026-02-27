import { startTransition, useEffect, useState, useRef } from 'react'
import { fetchDashboardSnapshot, fetchStatusSnapshot } from '~/lib/client-api'
import type { DashboardSnapshot, StoredEvent } from '~/lib/types'
import { NotificationManager, getLastSeenTimestamp, setLastSeenTimestamp } from '~/lib/notifications'

interface UseDashboardDataOptions {
  mode: 'logs' | 'status'
  workspace?: string
  topicPrefix?: string
  pollMs?: number
}

function isTestEvent(event: StoredEvent): boolean {
  const content = event.content?.trim()
  return typeof content === 'string' && content.startsWith('TEST EVENT ')
}

export function useDashboardData({ mode, workspace, topicPrefix, pollMs = 4000 }: UseDashboardDataOptions) {
  const [data, setData] = useState<DashboardSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSeenAt, setLastSeenAtState] = useState<number>(0)
  
  // Track the most recent timestamp seen during this session
  const lastKnownTsRef = useRef<number>(0)
  const hasInitialLoadRef = useRef(false)

  useEffect(() => {
    // Load from localStorage on mount (client-only)
    const initialSeen = getLastSeenTimestamp()
    setLastSeenAtState(initialSeen)
    lastKnownTsRef.current = initialSeen
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async (silent = false) => {
      try {
        if (!silent) {
          setIsLoading(true)
        } else {
          setIsRefreshing(true)
        }

        const next =
          mode === 'status' 
            ? await fetchStatusSnapshot(topicPrefix, workspace) 
            : await fetchDashboardSnapshot({ topicPrefix, workspace })

        if (!cancelled) {
          // Check for new events since last poll to trigger beep/notify
          if (next.events && next.events.length > 0) {
            const newest = Math.max(...next.events.map(e => new Date(e.timestamp).getTime()))
            
            if (hasInitialLoadRef.current && newest > lastKnownTsRef.current) {
              const newEvents = next.events.filter(e => new Date(e.timestamp).getTime() > lastKnownTsRef.current)
              const count = newEvents.length
              if (count > 0) {
                NotificationManager.playBeep()
                if (count === 1) {
                  const e = newEvents.find(e => new Date(e.timestamp).getTime() === newest) ?? newEvents[0]
                  const isTest = isTestEvent(e)
                  void NotificationManager.showLocalNotification(
                    isTest ? 'Tailwatch Test Event' : 'Tailwatch New Event',
                    `${e.path}: ${e.content?.slice(0, 80) || (isTest ? 'Test signal received.' : 'No content')}`,
                  )
                } else {
                  const testCount = newEvents.filter(isTestEvent).length
                  if (testCount === count) {
                    void NotificationManager.showLocalNotification('Tailwatch Test Events', `Received ${count} test events.`)
                  } else {
                    void NotificationManager.showLocalNotification('Tailwatch New Events', `Received ${count} new telemetry entries.`)
                  }
                }
              }
            }
            
            lastKnownTsRef.current = newest
          }

          setData(next)
          setError(null)
          hasInitialLoadRef.current = true
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void load(false)
    const timer = window.setInterval(() => {
      void load(true)
    }, pollMs)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [mode, workspace, topicPrefix, pollMs])

  const markAllSeen = () => {
    // Determine the newest timestamp from current data (events or entity updates)
    let newest = lastSeenAt
    if (data?.events && data.events.length > 0) {
      newest = Math.max(newest, ...data.events.map(e => new Date(e.timestamp).getTime()))
    }
    if (data?.entities && data.entities.length > 0) {
      newest = Math.max(newest, ...data.entities.map(e => new Date(e.lastSeenAt).getTime()))
    }

    setLastSeenTimestamp(newest)
    setLastSeenAtState(newest)
  }

  const refresh = () => {
    startTransition(() => {
      setIsRefreshing(true)
      const request =
        mode === 'status'
          ? fetchStatusSnapshot(topicPrefix, workspace)
          : fetchDashboardSnapshot({ topicPrefix, workspace })

      void request
        .then((next) => {
          setData(next)
          setError(null)
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to refresh dashboard data')
        })
        .finally(() => {
          setIsLoading(false)
          setIsRefreshing(false)
        })
    })
  }

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
    markAllSeen,
    lastSeenAt
  }
}
