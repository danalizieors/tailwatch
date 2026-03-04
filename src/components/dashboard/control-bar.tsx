import { Hash, LayoutGrid } from 'lucide-react'
import type { TopicNode } from '~/lib/types'
import { cn } from '~/lib/utils'
import { TopicSelector } from './topic-selector'

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
    <div className='flex flex-col gap-3 backdrop-blur-sm md:flex-row md:items-center md:gap-4'>
      {/* Topic Selector */}
      <div className='min-w-0 flex-1'>
        <TopicSelector
          tree={topicTree}
          selectedTopic={selectedTopic}
          onSelectTopic={onSelectTopic}
          className='bg-background/80 border-border/60 h-10'
        />
      </div>

      <div className='bg-border/40 hidden h-8 w-px md:block' />

      {/* Mode Switcher */}
      <div className='border-border/60 bg-background/50 inline-flex h-10 shrink-0 items-center rounded-lg border p-1'>
        <button
          type='button'
          onClick={() => onModeChange('logs')}
          className={cn(
            'flex h-full min-w-28 flex-1 items-center justify-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold tracking-wide transition-all',
            mode === 'logs'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Hash className='h-3.5 w-3.5' />
          Logs
        </button>
        <button
          type='button'
          onClick={() => onModeChange('status')}
          className={cn(
            'flex h-full min-w-28 flex-1 items-center justify-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold tracking-wide transition-all',
            mode === 'status'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <LayoutGrid className='h-3.5 w-3.5' />
          Status
        </button>
      </div>
    </div>
  )
}
