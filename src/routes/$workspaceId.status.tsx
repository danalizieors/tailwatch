import { createFileRoute } from '@tanstack/react-router'
import { DashboardView } from '~/components/dashboard/dashboard-view'

export const Route = createFileRoute('/$workspaceId/status')({
  component: WorkspaceStatusPage,
})

function WorkspaceStatusPage() {
  const { workspaceId } = Route.useParams()
  return <DashboardView mode="status" workspace={workspaceId} />
}
