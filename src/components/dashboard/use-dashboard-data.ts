import { startTransition, useEffect, useState } from 'react'
import { fetchDashboardSnapshot, fetchStatusSnapshot } from '~/lib/client-api'
import type { DashboardSnapshot } from '~/lib/types'

interface UseDashboardDataOptions {
  mode: 'logs' | 'status'
  topicPrefix?: string
  pollMs?: number
}

export function useDashboardData({ mode, topicPrefix, pollMs = 4000 }: UseDashboardDataOptions) {
  const [data, setData] = useState<DashboardSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

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
          mode === 'status' ? await fetchStatusSnapshot(topicPrefix) : await fetchDashboardSnapshot({ topicPrefix })

        if (!cancelled) {
          setData(next)
          setError(null)
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
  }, [mode, topicPrefix, pollMs])

  const refresh = () => {
    startTransition(() => {
      setIsRefreshing(true)
      const request =
        mode === 'status' ? fetchStatusSnapshot(topicPrefix) : fetchDashboardSnapshot({ topicPrefix })

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
  }
}

