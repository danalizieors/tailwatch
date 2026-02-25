import type { StoredEvent } from '~/lib/types'
import { listPushSubscriptions, removePushSubscription } from '~/lib/server/event-repository'
import { isWebPushConfigured, sendWebPushWake } from '~/lib/server/web-push'

export async function notifyPushSubscribersForEvent(event: StoredEvent) {
  if (!isWebPushConfigured()) {
    return { attempted: 0, delivered: 0, pruned: 0, skipped: true }
  }

  const subscriptions = await listPushSubscriptions(event.workspace || 'default')
  if (subscriptions.length === 0) {
    return { attempted: 0, delivered: 0, pruned: 0, skipped: false }
  }

  let delivered = 0
  let pruned = 0

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const result = await sendWebPushWake(subscription.endpoint)
      if (result.ok) {
        delivered += 1
        return
      }

      if (result.status === 404 || result.status === 410) {
        try {
          const pruneResult = await removePushSubscription(subscription.endpoint)
          pruned += pruneResult.deleted ?? 0
        } catch (error) {
          console.warn('[PushNotifier] Failed to prune stale subscription', error)
        }
      } else if (!result.skipped) {
        console.warn('[PushNotifier] Push delivery failed', {
          status: result.status,
          error: result.error,
        })
      }
    }),
  )

  return {
    attempted: subscriptions.length,
    delivered,
    pruned,
    skipped: false,
  }
}
