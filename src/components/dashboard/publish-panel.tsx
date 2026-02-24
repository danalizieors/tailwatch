import { type FormEvent, useState } from 'react'
import { Send, Cpu } from 'lucide-react'
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
      setResult(`ACK: /${created.path}`)
      onPublished()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="flex flex-col border-border/40 bg-card/40 backdrop-blur shadow-sm card-hover-effect overflow-hidden relative">
      <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 blur-3xl pointer-events-none rounded-full" />
      <CardHeader className="pb-4 border-b border-border/20 bg-background/20 relative z-10">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <CardTitle className="font-mono text-lg tracking-tight">Event.Injector</CardTitle>
        </div>
        <CardDescription className="text-xs">Send test payloads to a specific namespace.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 relative z-10">
        <form className="space-y-4 font-mono text-sm" onSubmit={submit}>
          <div className="space-y-2 group/field">
            <Label htmlFor="topic-path" className="text-xs uppercase tracking-widest text-muted-foreground group-focus-within/field:text-primary transition-colors">Path</Label>
            <Input
              id="topic-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="team-a/project-x/task/demo"
              className="font-mono bg-background/50 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-xs py-5"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 group/field">
              <Label htmlFor="event-type" className="text-xs uppercase tracking-widest text-muted-foreground group-focus-within/field:text-primary transition-colors">Type</Label>
              <select
                id="event-type"
                className="h-10 w-full rounded-md border border-border/40 bg-background/50 px-3 text-xs outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/40 cursor-pointer text-foreground/90"
                value={type}
                onChange={(event) => setType(event.target.value as EventType)}
              >
                {['log', 'start', 'heartbeat', 'stop', 'error', 'status'].map((option) => (
                  <option key={option} value={option} className="bg-background">
                    {option.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 group/field">
              <Label htmlFor="entity-type" className="text-xs uppercase tracking-widest text-muted-foreground group-focus-within/field:text-primary transition-colors">Entity Type</Label>
              <Input 
                id="entity-type" 
                value={entityType} 
                onChange={(event) => setEntityType(event.target.value)} 
                className="font-mono bg-background/50 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-xs h-10"
              />
            </div>
          </div>
          <div className="space-y-2 group/field">
            <Label htmlFor="entity-id" className="text-xs uppercase tracking-widest text-muted-foreground group-focus-within/field:text-primary transition-colors">Entity ID <span className="text-[10px] text-muted-foreground/60 normal-case tracking-normal">(OPTIONAL)</span></Label>
            <Input 
              id="entity-id" 
              value={entityId} 
              onChange={(event) => setEntityId(event.target.value)} 
              className="font-mono bg-background/50 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-xs h-10"
            />
          </div>
          <div className="space-y-2 group/field">
            <Label htmlFor="content" className="text-xs uppercase tracking-widest text-muted-foreground group-focus-within/field:text-primary transition-colors">Payload</Label>
            <Textarea 
              id="content" 
              value={content} 
              onChange={(event) => setContent(event.target.value)} 
              rows={3}
              className="font-mono bg-background/50 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-xs resize-none scroll-thin" 
            />
          </div>
          
          <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
            <Button 
              type="submit" 
              disabled={isSubmitting || !path.trim()}
              className="w-full flex items-center justify-center gap-2 tracking-wide text-xs uppercase"
            >
              <Send className="h-3 w-3" />
              {isSubmitting ? 'Injecting...' : 'Inject Event'}
            </Button>
            
            <div className="flex items-center justify-center min-h-[20px] text-[10px]">
              {result && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{result}</span>}
              {error && <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{error}</span>}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
