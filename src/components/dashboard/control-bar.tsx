import { Hash, LayoutGrid } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TopicNode } from '~/lib/types'
import { cn } from '~/lib/utils'
import { TopicSelector } from './topic-selector'

interface ControlBarProps {
  mode: 'logs' | 'status'
  onModeChange: (mode: 'logs' | 'status') => void
  topicTree: TopicNode[]
  selectedTopic?: string
  onSelectTopic: (topic?: string) => void
  rightSlot?: ReactNode
}

export function ControlBar({
  mode,
  onModeChange,
  topicTree,
  selectedTopic,
  onSelectTopic,
  rightSlot,
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

      <div className='flex items-center gap-2 md:shrink-0 md:gap-4'>
        <div className='bg-border/40 hidden h-8 w-px md:block' />

        {/* Mode Switcher */}
        <div className='inline-flex h-11 min-w-0 flex-1 items-center rounded-lg border border-white/5 bg-zinc-900/40 p-1 backdrop-blur-md md:flex-none'>
          <button
            type='button'
            onClick={() => onModeChange('logs')}
            className={cn(
              'flex h-full min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all md:min-w-28 md:px-4',
              mode === 'logs'
                ? 'bg-primary shadow-primary/10 text-black shadow-lg'
                : 'hover:text-foreground text-zinc-500',
            )}
          >
            <Hash className='h-3.5 w-3.5' />
            Logs
          </button>
          <button
            type='button'
            onClick={() => onModeChange('status')}
            className={cn(
              'flex h-full min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all md:min-w-28 md:px-4',
              mode === 'status'
                ? 'bg-primary shadow-primary/10 text-black shadow-lg'
                : 'hover:text-foreground text-zinc-500',
            )}
          >
            <LayoutGrid className='h-3.5 w-3.5' />
            Status
          </button>
        </div>

        {rightSlot ? <div className='shrink-0'>{rightSlot}</div> : null}
      </div>
    </div>
  )
}
