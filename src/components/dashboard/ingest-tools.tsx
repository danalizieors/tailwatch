import {
  Box,
  Check,
  ChevronDown,
  Copy,
  Info,
  Shuffle,
  Terminal,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { cn } from '~/lib/utils'

interface IngestToolsProps {
  volumePublishKey: string | null
  selectedTopic?: string
  onSendTest: () => Promise<void>
  isGeneratingRandomEvents: boolean
  generatorMessage: string | null
}

export function IngestTools({
  volumePublishKey,
  selectedTopic,
  onSendTest,
  isGeneratingRandomEvents,
  generatorMessage,
}: IngestToolsProps) {
  const [isCurlExpanded, setIsCurlExpanded] = useState(true)
  const [copiedVariant, setCopiedVariant] = useState<'header' | 'url' | null>(
    null,
  )

  const curlCommands = useMemo(() => {
    if (!selectedTopic || !volumePublishKey) return null

    const baseUrl =
      typeof window === 'undefined'
        ? 'http://localhost:3000'
        : window.location.origin
    const encodedKey = encodeURIComponent(volumePublishKey)
    const encodedPath = selectedTopic
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/')

    const body = `busy --- Synthetic signal (${Math.random().toString(36).slice(2, 8)})`
    const escapedBody = body.replace(/'/g, `'"'"'`)

    return {
      header: `curl "${baseUrl}/api/publish/${encodedPath}" -H "x-volume-key: ${volumePublishKey}" -d '${escapedBody}'`,
      url: `curl "${baseUrl}/api/publish/${encodedKey}/${encodedPath}" -d '${escapedBody}'`,
    }
  }, [selectedTopic, volumePublishKey])

  useEffect(() => {
    if (!copiedVariant) return
    const timer = setTimeout(() => setCopiedVariant(null), 2000)
    return () => clearTimeout(timer)
  }, [copiedVariant])

  const copyToClipboard = (text: string, variant: 'header' | 'url') => {
    void navigator.clipboard.writeText(text)
    setCopiedVariant(variant)
  }

  return (
    <div className='space-y-4'>
      {/* Test Event Section */}
      <Card className='border-primary/20 bg-primary/5 overflow-hidden shadow-sm'>
        <CardHeader className='p-4 pb-2'>
          <CardTitle className='text-primary flex items-center gap-2 text-xs font-black tracking-widest uppercase'>
            <Shuffle className='h-3.5 w-3.5' />
            Quick Test
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 p-4 pt-0'>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            Push a randomized event to the current volume to verify your
            integration.
          </p>
          <Button
            size='sm'
            className='h-9 w-full gap-2 rounded-lg text-xs font-black tracking-widest uppercase shadow-sm'
            onClick={onSendTest}
            disabled={isGeneratingRandomEvents}
          >
            {isGeneratingRandomEvents ? (
              <span className='flex items-center gap-2'>
                <div className='h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
                Sending...
              </span>
            ) : (
              <>
                <Shuffle className='h-3.5 w-3.5' />
                Send Test Event
              </>
            )}
          </Button>
          {generatorMessage && (
            <p
              className={cn(
                'text-center text-xs font-black tracking-widest uppercase',
                generatorMessage.includes('Failed')
                  ? 'text-destructive'
                  : 'text-info',
              )}
            >
              {generatorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Curl Instructions */}
      <Card className='border-border/60 bg-card/50 overflow-hidden shadow-sm'>
        <CardHeader
          className='hover:bg-muted/30 cursor-pointer p-4 pb-2 transition-colors'
          onClick={() => setIsCurlExpanded(!isCurlExpanded)}
        >
          <CardTitle className='flex items-center justify-between gap-2 text-xs font-black tracking-widest text-zinc-300 uppercase'>
            <div className='flex items-center gap-2'>
              <Terminal className='h-3.5 w-3.5' />
              Ingest via Curl
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isCurlExpanded && 'rotate-180',
              )}
            />
          </CardTitle>
        </CardHeader>

        {isCurlExpanded && (
          <CardContent className='animate-in fade-in slide-in-from-top-1 space-y-4 p-4 pt-2 duration-200'>
            {!selectedTopic ? (
              <div className='bg-muted/40 flex items-start gap-2 rounded-lg p-3'>
                <Info className='text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0' />
                <p className='text-muted-foreground text-xs leading-normal font-medium'>
                  Select a topic/path in the navigator above to see your
                  customized ingest commands.
                </p>
              </div>
            ) : !volumePublishKey ? (
              <div className='bg-warning/10 border-warning/20 flex items-start gap-2 rounded-lg border p-3'>
                <Box className='text-warning mt-0.5 h-3.5 w-3.5 shrink-0' />
                <p className='text-warning text-xs leading-normal font-black tracking-widest uppercase'>
                  No API key found for this volume. Please check your volume
                  settings to enable publishing.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-center justify-end'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 gap-1.5 px-2 text-xs font-black tracking-widest uppercase'
                      onClick={() =>
                        curlCommands &&
                        copyToClipboard(curlCommands.header, 'header')
                      }
                    >
                      {copiedVariant === 'header' ? (
                        <Check className='text-success h-3 w-3' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                      {copiedVariant === 'header' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className='border-border/40 bg-background/50 text-foreground overflow-x-auto rounded-lg border p-2.5 font-mono text-xs leading-relaxed'>
                    <code>{curlCommands?.header}</code>
                  </pre>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center justify-end'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 gap-1.5 px-2 text-xs font-black tracking-widest uppercase'
                      onClick={() =>
                        curlCommands && copyToClipboard(curlCommands.url, 'url')
                      }
                    >
                      {copiedVariant === 'url' ? (
                        <Check className='text-success h-3 w-3' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                      {copiedVariant === 'url' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className='border-border/40 bg-background/50 text-foreground overflow-x-auto rounded-lg border p-2.5 font-mono text-xs leading-relaxed'>
                    <code>{curlCommands?.url}</code>
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
