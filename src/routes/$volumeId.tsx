import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'
import { AuthenticatedDashboard } from '~/components/dashboard/authenticated-dashboard'

export const Route = createFileRoute('/$volumeId')({
  component: VolumeDashboardPage,
})

function VolumeDashboardPage() {
  const { volumeId } = Route.useParams()
  return (
    <AuthenticatedDashboard>
      <DashboardView mode="logs" volume={volumeId} />
    </AuthenticatedDashboard>
  )
}
