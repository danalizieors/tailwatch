import { useState, useEffect, useMemo } from 'react'
import { Check, Copy, ChevronDown, Shuffle, Info, Terminal, Box } from 'lucide-react'
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
  const [copiedVariant, setCopiedVariant] = useState<'header' | 'url' | null>(null)

  const curlCommands = useMemo(() => {
    if (!selectedTopic || !volumePublishKey) return null
    
    const baseUrl = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin
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
    <div className="space-y-4">
      {/* Test Event Section */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
            <Shuffle className="h-3.5 w-3.5" />
            Quick Test
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Push a randomized event to the current volume to verify your integration.
          </p>
          <Button
            size="sm"
            className="w-full h-9 rounded-lg font-black uppercase tracking-widest text-xs gap-2 shadow-sm"
            onClick={onSendTest}
            disabled={isGeneratingRandomEvents}
          >
            {isGeneratingRandomEvents ? (
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending...
              </span>
            ) : (
              <>
                <Shuffle className="h-3.5 w-3.5" />
                Send Test Event
              </>
            )}
          </Button>
          {generatorMessage && (
            <p className={cn(
              "text-xs font-black uppercase tracking-widest text-center",
              generatorMessage.includes('Failed') ? "text-destructive" : "text-info"
            )}>
              {generatorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Curl Instructions */}
      <Card className="border-border/60 bg-card/50 shadow-sm overflow-hidden">
        <CardHeader 
          className="p-4 pb-2 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setIsCurlExpanded(!isCurlExpanded)}
        >
          <CardTitle className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-widest text-zinc-300">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" />
              Ingest via Curl
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isCurlExpanded && "rotate-180")} />
          </CardTitle>
        </CardHeader>
        
        {isCurlExpanded && (
          <CardContent className="p-4 pt-2 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            {!selectedTopic ? (
              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground font-medium leading-normal">
                  Select a topic/path in the navigator above to see your customized ingest commands.
                </p>
              </div>
            ) : !volumePublishKey ? (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
                <Box className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning font-black uppercase tracking-widest leading-normal">
                  No API key found for this volume. Please check your volume settings to enable publishing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs font-black uppercase tracking-widest gap-1.5"
                      onClick={() => curlCommands && copyToClipboard(curlCommands.header, 'header')}
                    >
                      {copiedVariant === 'header' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      {copiedVariant === 'header' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-border/40 bg-background/50 p-2.5 font-mono text-xs leading-relaxed text-foreground">
                    <code>{curlCommands?.header}</code>
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs font-black uppercase tracking-widest gap-1.5"
                      onClick={() => curlCommands && copyToClipboard(curlCommands.url, 'url')}
                    >
                      {copiedVariant === 'url' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      {copiedVariant === 'url' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-border/40 bg-background/50 p-2.5 font-mono text-xs leading-relaxed text-foreground">
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
