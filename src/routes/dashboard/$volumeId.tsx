import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedDashboard } from '~/components/dashboard/authenticated-dashboard'
import { DashboardView } from '~/components/dashboard/dashboard-view'
import { buildNoIndexPageHead } from '~/lib/seo'

export const Route = createFileRoute('/dashboard/$volumeId')({
  head: () =>
    buildNoIndexPageHead({
      title: 'Dashboard | Tailwatch',
      description: 'Private Tailwatch dashboard.',
    }),
  component: VolumeDashboardPage,
})

function VolumeDashboardPage() {
  const { volumeId } = Route.useParams()
  return (
    <AuthenticatedDashboard>
      <DashboardView initialMode='logs' volume={volumeId} />
    </AuthenticatedDashboard>
  )
}
