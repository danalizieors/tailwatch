import { createFileRoute } from '@tanstack/react-router'
import { EndpointsRemoved } from '~/components/server/endpoints-removed'

export const Route = createFileRoute('/status')({
  component: StatusDashboardPage,
})

function StatusDashboardPage() {
  return (
    <EndpointsRemoved
      title="Status board removed"
      description="Status data used API endpoints that are no longer available."
    />
  )
}
