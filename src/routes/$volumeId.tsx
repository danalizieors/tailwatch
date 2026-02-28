import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'

export const Route = createFileRoute('/$volumeId')({
  component: VolumeDashboardPage,
})

function VolumeDashboardPage() {
  const { volumeId } = Route.useParams()
  return <DashboardView mode="logs" volume={volumeId} />
}
