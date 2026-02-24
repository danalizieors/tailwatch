import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'

export const Route = createFileRoute('/status')({
  component: StatusDashboardPage,
})

function StatusDashboardPage() {
  return <DashboardView mode="status" />
}

