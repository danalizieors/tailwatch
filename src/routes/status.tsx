import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'
import { AuthenticatedDashboard } from '~/components/dashboard/authenticated-dashboard'

export const Route = createFileRoute('/status')({
  component: StatusDashboardPage,
})

function StatusDashboardPage() {
  return (
    <AuthenticatedDashboard>
      <DashboardView mode="status" volume="personal" />
    </AuthenticatedDashboard>
  )
}
