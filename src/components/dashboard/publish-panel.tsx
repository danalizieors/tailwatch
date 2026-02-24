import { type FormEvent, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { publishEvent } from '~/lib/client-api'
import type { EventType } from '~/lib/types'

interface PublishPanelProps {
  onPublished: () => void
}

const DEFAULT_TOPIC = 'team-a/project-x/task/demo'

export function PublishPanel({ onPublished }: PublishPanelProps) {
  const [path, setPath] = useState(DEFAULT_TOPIC)
  const [type, setType] = useState<EventType>('log')
  const [entityId, setEntityId] = useState('demo-task')
  const [entityType, setEntityType] = useState('task')
  const [content, setContent] = useState('Hello from Tailwatch')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setResult(null)
    setError(null)
    try {
      const created = await publishEvent(path, {
        type,
        entityId: entityId || undefined,
        entityType: entityType || undefined,
        content: content || undefined,
        level: type === 'error' ? 'error' : type === 'log' ? 'info' : undefined,
        status: type === 'status' ? 'idle' : type === 'stop' ? 'success' : undefined,
        runId: ['start', 'heartbeat', 'stop', 'error'].includes(type) ? 'demo_run_1' : undefined,
      })
      setResult(`Published ${created.type} to /${created.path}`)
      onPublished()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-white/70 bg-white/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle>Publish Event</CardTitle>
        <CardDescription>Send a test event to a URL-like topic path to populate the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="topic-path">Topic path</Label>
            <Input
              id="topic-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="team-a/project-x/task/demo"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-type">Type</Label>
              <select
                id="event-type"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={type}
                onChange={(event) => setType(event.target.value as EventType)}
              >
                {['log', 'start', 'heartbeat', 'stop', 'error', 'status'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entity-type">Entity type</Label>
              <Input id="entity-type" value={entityType} onChange={(event) => setEntityType(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entity-id">Entity ID (optional)</Label>
            <Input id="entity-id" value={entityId} onChange={(event) => setEntityId(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting || !path.trim()}>
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Publishing…' : 'Publish'}
            </Button>
            {result && <span className="text-xs text-emerald-700">{result}</span>}
            {error && <span className="text-xs text-red-700">{error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
