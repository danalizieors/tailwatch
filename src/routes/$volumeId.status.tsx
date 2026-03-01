import { createFileRoute } from '@tanstack/react-router'
import { EndpointsRemoved } from '~/components/server/endpoints-removed'

export const Route = createFileRoute('/$volumeId/status')({
  component: VolumeStatusPage,
})

function VolumeStatusPage() {
  const { volumeId } = Route.useParams()
  return (
    <EndpointsRemoved
      title={`Volume "${volumeId}" status board removed`}
      description="This page required backend endpoint support that has been removed."
    />
  )
}
