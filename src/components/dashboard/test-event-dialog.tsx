import { X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

interface TestEventDialogProps {
  open: boolean
  onClose: () => void
  path: string
  onPathChange: (value: string) => void
  status: 'idle' | 'busy'
  onStatusChange: (value: 'idle' | 'busy') => void
  content: string
  onContentChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  error?: string | null
}

export function TestEventDialog({
  open,
  onClose,
  path,
  onPathChange,
  status,
  onStatusChange,
  content,
  onContentChange,
  onSend,
  isSending,
  error,
}: TestEventDialogProps) {
  if (!open) return null

  return (
    <>
      <div
        className='fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      <div className='fixed inset-0 z-[130] flex items-start justify-center p-4 sm:items-center'>
        <Card className='w-full max-w-2xl border-white/10 bg-zinc-950/90'>
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between gap-3'>
              <CardTitle className='text-sm font-semibold tracking-wide'>
                Test
              </CardTitle>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 rounded-lg'
                onClick={onClose}
                disabled={isSending}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </CardHeader>

          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold tracking-wide'>
                Path
              </Label>
              <Input
                value={path}
                onChange={(event) => onPathChange(event.target.value)}
                placeholder='team-x/project-y/task-z'
                className='bg-background/70 font-mono text-xs'
                disabled={isSending}
              />
            </div>

            <div className='space-y-3'>
              <Label className='text-xs font-semibold tracking-wide'>
                Status
              </Label>
              <div className='inline-flex h-9 items-center rounded-lg border border-white/10 bg-zinc-900/60 p-1'>
                <button
                  type='button'
                  onClick={() => onStatusChange('idle')}
                  className={cn(
                    'h-full rounded-md px-3 text-xs font-semibold tracking-wide',
                    status === 'idle'
                      ? 'bg-primary text-black'
                      : 'text-zinc-400 hover:text-zinc-200',
                  )}
                  disabled={isSending}
                >
                  Idle
                </button>
                <button
                  type='button'
                  onClick={() => onStatusChange('busy')}
                  className={cn(
                    'h-full rounded-md px-3 text-xs font-semibold tracking-wide',
                    status === 'busy'
                      ? 'bg-zinc-300 text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-200',
                  )}
                  disabled={isSending}
                >
                  Busy
                </button>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold tracking-wide'>
                Content
              </Label>
              <Textarea
                value={content}
                onChange={(event) => onContentChange(event.target.value)}
                className='min-h-44 bg-background/70 font-mono text-xs leading-5'
                disabled={isSending}
              />
            </div>

            {error ? (
              <p className='text-destructive text-xs font-semibold tracking-wide'>
                {error}
              </p>
            ) : null}

            <div className='flex justify-end'>
              <Button
                onClick={onSend}
                disabled={isSending}
                className='h-10 min-w-32 text-xs tracking-wide'
              >
                {isSending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
