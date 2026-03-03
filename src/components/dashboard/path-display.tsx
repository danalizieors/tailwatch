import { cn, getPathColor } from '~/lib/utils'

interface PathDisplayProps {
  path: string
  className?: string
  segmentClassName?: string
  onClickSegment?: (partialPath: string) => void
}

export function PathDisplay({
  path,
  className,
  segmentClassName,
  onClickSegment,
}: PathDisplayProps) {
  const segments = path.split('/').filter(Boolean)

  return (
    <div
      className={cn(
        'flex min-w-0 items-center overflow-hidden font-mono',
        className,
      )}
    >
      {/* ROOT */}
      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation()
          onClickSegment?.('')
        }}
        className={cn(
          'hover:bg-muted rounded px-1 font-bold transition-all',
          segments.length === 0 ? 'text-primary' : 'text-zinc-500',
          segmentClassName,
        )}
      >
        /
      </button>

      {/* SEGMENTS */}
      {segments.map((segment, idx) => {
        const partialPath = segments.slice(0, idx + 1).join('/')
        const color = getPathColor(partialPath)
        const isLast = idx === segments.length - 1

        return (
          <div key={idx} className='flex shrink-0 items-center'>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                onClickSegment?.(partialPath)
              }}
              className={cn(
                'rounded px-0.5 py-0.5 whitespace-nowrap transition-all md:px-1',
                isLast
                  ? 'font-bold'
                  : 'hover:text-foreground hover:bg-muted text-zinc-400',
                segmentClassName,
              )}
              style={{ color: isLast ? color : undefined }}
            >
              {segment}
            </button>
            <span className='px-0.5 text-zinc-600 select-none'>/</span>
          </div>
        )
      })}
    </div>
  )
}
