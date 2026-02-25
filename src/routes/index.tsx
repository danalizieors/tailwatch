import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'

export const Route = createFileRoute('/')({
  component: LogDashboardPage,
})

function LogDashboardPage() {
  return <DashboardView mode="logs" workspace="default" />
}

