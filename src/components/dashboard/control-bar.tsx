import { LayoutGrid, Hash } from 'lucide-react'
import { cn } from '~/lib/utils'
import { TopicSelector } from './topic-selector'
import type { TopicNode } from '~/lib/types'

interface ControlBarProps {
  mode: 'logs' | 'status'
  logsModeHref: string
  statusModeHref: string
  topicTree: TopicNode[]
  selectedTopic?: string
  onSelectTopic: (topic?: string) => void
}

export function ControlBar({
  mode,
  logsModeHref,
  statusModeHref,
  topicTree,
  selectedTopic,
  onSelectTopic,
}: ControlBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/30 p-2 md:flex-row md:items-center md:gap-4 md:px-4 md:py-2 backdrop-blur-sm">
      {/* Mode Switcher */}
      <div className="flex flex-col shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1.5 ml-1">View Mode</span>
        <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/50 p-1 h-8">
          <a
            href={logsModeHref}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all',
              mode === 'logs'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Hash className="h-3 w-3" />
            Logs
          </a>
          <a
            href={statusModeHref}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all',
              mode === 'status'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            Status
          </a>
        </div>
      </div>

      <div className="hidden w-px h-8 bg-border/40 md:block" />

      {/* Topic Selector */}
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1.5 ml-1">Path Navigator</span>
        <TopicSelector
          tree={topicTree}
          selectedTopic={selectedTopic}
          onSelectTopic={onSelectTopic}
          className="h-8 !bg-background/50 border-border/60"
        />
      </div>
    </div>
  )
}
