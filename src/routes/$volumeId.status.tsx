import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'
import { AuthenticatedDashboard } from '~/components/dashboard/authenticated-dashboard'

export const Route = createFileRoute('/$volumeId/status')({
  component: VolumeStatusPage,
})

function VolumeStatusPage() {
  const { volumeId } = Route.useParams()
  return (
    <AuthenticatedDashboard>
      <DashboardView mode="status" volume={volumeId} />
    </AuthenticatedDashboard>
  )
}
