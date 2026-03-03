import { LayoutGrid, Hash, PanelLeft } from 'lucide-react'
import { cn } from '~/lib/utils'
import { TopicSelector } from './topic-selector'
import type { TopicNode } from '~/lib/types'
import { Button } from '../ui/button'

interface ControlBarProps {
  mode: 'logs' | 'status'
  onModeChange: (mode: 'logs' | 'status') => void
  topicTree: TopicNode[]
  selectedTopic?: string
  onSelectTopic: (topic?: string) => void
  onToggleSidebar?: () => void
}

export function ControlBar({
  mode,
  onModeChange,
  topicTree,
  selectedTopic,
  onSelectTopic,
  onToggleSidebar,
}: ControlBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/30 p-3 md:flex-row md:items-center md:gap-4 md:px-4 md:py-2 backdrop-blur-sm">
      {/* Sidebar Toggle (Mobile only) */}
      <div className="flex flex-col lg:hidden">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-300 leading-none mb-2 ml-1">Context</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-full rounded-lg border border-border/60 bg-background/50 text-primary flex items-center justify-center gap-2 px-4 shadow-sm active:scale-95 transition-transform"
          onClick={onToggleSidebar}
          title="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-widest">Volumes & Devices</span>
        </Button>
      </div>

      <div className="hidden w-px h-10 bg-border/40 lg:hidden md:block" />

      {/* Mode Switcher */}
      <div className="flex flex-col shrink-0">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-300 leading-none mb-2 ml-1">View Mode</span>
        <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/50 p-1 h-10">
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

      <div className="hidden w-px h-8 bg-border/40 md:block" />

      {/* Topic Selector */}
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-300 leading-none mb-2 ml-1">Path Navigator</span>
        <TopicSelector
          tree={topicTree}
          selectedTopic={selectedTopic}
          onSelectTopic={onSelectTopic}
          className="h-10 bg-background/80 border-border/60"
        />
      </div>
    </div>
  )
}
