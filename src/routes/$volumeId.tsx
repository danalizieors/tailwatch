import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedDashboard } from '~/components/dashboard/authenticated-dashboard'
import { DashboardView } from '~/components/dashboard/dashboard-view'

export const Route = createFileRoute('/$volumeId')({
  component: VolumeDashboardPage,
})

function VolumeDashboardPage() {
  const { volumeId } = Route.useParams()
  return (
    <AuthenticatedDashboard>
      <DashboardView mode='logs' volume={volumeId} />
    </AuthenticatedDashboard>
  )
}
