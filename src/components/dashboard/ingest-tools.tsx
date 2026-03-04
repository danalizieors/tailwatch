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
      <Card className='border-primary/20 bg-primary/5 overflow-hidden rounded-xl shadow-sm transition-all'>
        <CardHeader className='p-6 pb-2'>
          <CardTitle className='text-primary flex items-center gap-2 text-xs font-bold tracking-widest uppercase'>
            <Shuffle className='h-3.5 w-3.5' />
            Quick Test
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4 p-6 pt-2'>
          <p className='text-zinc-500 text-xs leading-relaxed'>
            Push a randomized event to the current volume to verify your
            integration instantly.
          </p>
          <Button
            size='sm'
            className='h-11 w-full gap-2 rounded-lg text-xs font-bold tracking-wide shadow-primary-glow bg-primary text-black hover:opacity-90 transition-all'
            onClick={onSendTest}
            disabled={isGeneratingRandomEvents}
          >
            {isGeneratingRandomEvents ? (
              <span className='flex items-center gap-2'>
                <div className='h-3 w-3 animate-spin rounded-full border-2 border-black/20 border-t-black' />
                Sending Signal...
              </span>
            ) : (
              <>
                <Shuffle className='h-3.5 w-3.5' />
                Send Test Signal
              </>
            )}
          </Button>
          {generatorMessage && (
            <p
              className={cn(
                'text-center text-xs font-bold tracking-wide transition-all',
                generatorMessage.includes('Failed')
                  ? 'text-destructive'
                  : 'text-primary animate-pulse',
              )}
            >
              {generatorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Curl Instructions */}
      <Card className='border-white/5 bg-zinc-900/40 overflow-hidden rounded-xl shadow-sm backdrop-blur-md transition-all'>
        <CardHeader
          className='hover:bg-white/5 cursor-pointer p-6 pb-2 transition-colors'
          onClick={() => setIsCurlExpanded(!isCurlExpanded)}
        >
          <CardTitle className='flex items-center justify-between gap-2 text-xs font-bold tracking-widest uppercase text-zinc-400'>
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
          <CardContent className='animate-in fade-in slide-in-from-top-1 space-y-4 p-6 pt-4 duration-200'>
            {!selectedTopic ? (
              <div className='bg-white/5 flex items-start gap-2 rounded-2xl p-4'>
                <Info className='text-zinc-500 mt-0.5 h-3.5 w-3.5 shrink-0' />
                <p className='text-zinc-500 text-xs leading-normal font-medium'>
                  Select a topic/path above to generate customized ingest commands.
                </p>
              </div>
            ) : !volumePublishKey ? (
              <div className='bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 rounded-2xl p-4'>
                <Box className='text-amber-500 mt-0.5 h-3.5 w-3.5 shrink-0' />
                <p className='text-amber-500 text-xs leading-normal font-bold'>
                  No API key found. Check your volume settings.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between px-1'>
                    <span className='text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-widest'>Variant A // Header</span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 gap-1.5 px-3 text-[10px] font-bold tracking-widest uppercase rounded-lg border border-white/5 hover:bg-white/5 transition-colors'
                      onClick={() =>
                        curlCommands &&
                        copyToClipboard(curlCommands.header, 'header')
                      }
                    >
                      {copiedVariant === 'header' ? (
                        <Check className='h-3 w-3 text-primary' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                      {copiedVariant === 'header' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className='border-white/5 bg-black/40 text-primary/70 overflow-x-auto rounded-2xl border p-4 font-mono text-xs leading-relaxed'>
                    <code>{curlCommands?.header}</code>
                  </pre>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center justify-between px-1'>
                    <span className='text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-widest'>Variant B // URL</span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 gap-1.5 px-3 text-[10px] font-bold tracking-widest uppercase rounded-lg border border-white/5 hover:bg-white/5 transition-colors'
                      onClick={() =>
                        curlCommands && copyToClipboard(curlCommands.url, 'url')
                      }
                    >
                      {copiedVariant === 'url' ? (
                        <Check className='h-3 w-3 text-primary' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                      {copiedVariant === 'url' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className='border-white/5 bg-black/40 text-primary/70 overflow-x-auto rounded-2xl border p-4 font-mono text-xs leading-relaxed'>
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
