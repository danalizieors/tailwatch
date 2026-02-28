import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'

export const Route = createFileRoute('/$volumeId/status')({
  component: VolumeStatusPage,
})

function VolumeStatusPage() {
  const { volumeId } = Route.useParams()
  return <DashboardView mode="status" volume={volumeId} />
}
