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
          <p className='text-xs leading-relaxed text-zinc-500'>
            Push a randomized event to the current volume to verify your
            integration instantly.
          </p>
          <Button
            size='sm'
            className='shadow-primary-glow bg-primary h-11 w-full gap-2 rounded-lg text-xs font-bold tracking-wide text-black transition-all hover:opacity-90'
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
      <Card className='overflow-hidden rounded-xl border-white/5 bg-zinc-900/40 shadow-sm backdrop-blur-md transition-all'>
        <CardHeader
          className='cursor-pointer p-6 pb-2 transition-colors hover:bg-white/5'
          onClick={() => setIsCurlExpanded(!isCurlExpanded)}
        >
          <CardTitle className='flex items-center justify-between gap-2 text-xs font-bold tracking-widest text-zinc-400 uppercase'>
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
              <div className='flex items-start gap-2 rounded-2xl bg-white/5 p-4'>
                <Info className='mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500' />
                <p className='text-xs leading-normal font-medium text-zinc-500'>
                  Select a topic/path above to generate customized ingest
                  commands.
                </p>
              </div>
            ) : !volumePublishKey ? (
              <div className='flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4'>
                <Box className='mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500' />
                <p className='text-xs leading-normal font-bold text-amber-500'>
                  No API key found. Check your volume settings.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between px-1'>
                    <span className='font-mono text-[10px] font-bold tracking-widest text-zinc-600 uppercase'>
                      Variant A // Header
                    </span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 gap-1.5 rounded-lg border border-white/5 px-3 text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-white/5'
                      onClick={() =>
                        curlCommands &&
                        copyToClipboard(curlCommands.header, 'header')
                      }
                    >
                      {copiedVariant === 'header' ? (
                        <Check className='text-primary h-3 w-3' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                      {copiedVariant === 'header' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className='text-primary/70 overflow-x-auto rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-xs leading-relaxed'>
                    <code>{curlCommands?.header}</code>
                  </pre>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center justify-between px-1'>
                    <span className='font-mono text-[10px] font-bold tracking-widest text-zinc-600 uppercase'>
                      Variant B // URL
                    </span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 gap-1.5 rounded-lg border border-white/5 px-3 text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-white/5'
                      onClick={() =>
                        curlCommands && copyToClipboard(curlCommands.url, 'url')
                      }
                    >
                      {copiedVariant === 'url' ? (
                        <Check className='text-primary h-3 w-3' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                      {copiedVariant === 'url' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className='text-primary/70 overflow-x-auto rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-xs leading-relaxed'>
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
