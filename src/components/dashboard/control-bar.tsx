import { LayoutGrid, Hash } from 'lucide-react'
import { cn } from '~/lib/utils'
import { TopicSelector } from './topic-selector'
import type { TopicNode } from '~/lib/types'

interface ControlBarProps {
  mode: 'logs' | 'status'
  onModeChange: (mode: 'logs' | 'status') => void
  topicTree: TopicNode[]
  selectedTopic?: string
  onSelectTopic: (topic?: string) => void
}

export function ControlBar({
  mode,
  onModeChange,
  topicTree,
  selectedTopic,
  onSelectTopic,
}: ControlBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/30 p-3 md:flex-row md:items-center md:gap-4 md:px-4 md:py-2 backdrop-blur-sm">
      {/* Topic Selector */}
      <div className="flex-1 min-w-0">
        <TopicSelector
          tree={topicTree}
          selectedTopic={selectedTopic}
          onSelectTopic={onSelectTopic}
          className="h-10 bg-background/80 border-border/60"
        />
      </div>

      <div className="hidden w-px h-8 bg-border/40 md:block" />

      {/* Mode Switcher */}
      <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/50 p-1 h-10 shrink-0">
        <button
          type="button"
          onClick={() => onModeChange('logs')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all h-full min-w-28',
            mode === 'logs'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Hash className="h-3.5 w-3.5" />
          Logs
        </button>
        <button
          type="button"
          onClick={() => onModeChange('status')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all h-full min-w-28',
            mode === 'status'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Status
        </button>
      </div>
    </div>
  )
}
