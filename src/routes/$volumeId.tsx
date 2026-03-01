import { createFileRoute } from '@tanstack/react-router'
import { EndpointsRemoved } from '~/components/server/endpoints-removed'

export const Route = createFileRoute('/$volumeId')({
  component: VolumeDashboardPage,
})

function VolumeDashboardPage() {
  const { volumeId } = Route.useParams()
  return (
    <EndpointsRemoved
      title={`Volume "${volumeId}" dashboard removed`}
      description="This UI depended on server endpoints that are no longer part of this project."
    />
  )
}
