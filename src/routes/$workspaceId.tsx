import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'

export const Route = createFileRoute('/$workspaceId')({
  component: WorkspaceDashboardPage,
})

function WorkspaceDashboardPage() {
  const { workspaceId } = Route.useParams()
  return <DashboardView mode="logs" workspace={workspaceId} />
}
