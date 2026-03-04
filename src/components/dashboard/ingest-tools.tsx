import { Box, Check, Copy, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface IngestToolsProps {
  volumePublishKey: string | null
  selectedTopic?: string
}

export function IngestTools({
  volumePublishKey,
  selectedTopic,
}: IngestToolsProps) {
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

    const body = 'busy --- synthetic ingest check'
    const escapedBody = body.replace(/'/g, `'"'"'`)

    return {
      header: `curl "${baseUrl}/api/publish/key/${encodedPath}" -H "x-volume-key: ${volumePublishKey}" -d '${escapedBody}'`,
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
    <Card className='overflow-hidden rounded-xl border-white/5 bg-zinc-900/40 shadow-sm backdrop-blur-md transition-all'>
      <CardHeader className='p-4 pb-3 md:p-6 md:pb-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <CardTitle className='mr-auto flex min-w-0 items-center gap-2 text-xs font-bold tracking-widest text-zinc-400 uppercase'>
            Send events via cURL
          </CardTitle>
        </div>

        <p className='pt-2 text-xs leading-relaxed text-zinc-500'>
          Copy a curl command that publishes to the currently filtered path.
        </p>
      </CardHeader>

      <CardContent className='space-y-4 p-4 pt-3 md:p-6 md:pt-3'>
        {!selectedTopic ? (
          <div className='flex items-start gap-2 rounded-2xl bg-white/5 p-4'>
            <Info className='mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500' />
            <p className='text-xs leading-normal font-medium text-zinc-500'>
              Select a topic/path above to generate customized ingest commands.
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
                <span className='font-mono text-[10px] font-bold tracking-widest text-zinc-600'>
                  Volume key in header
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 gap-1.5 rounded-lg border border-white/5 px-3 text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-white/5'
                  onClick={() =>
                    curlCommands && copyToClipboard(curlCommands.header, 'header')
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
                <span className='font-mono text-[10px] font-bold tracking-widest text-zinc-600'>
                  Volume key in path
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
    </Card>
  )
}
