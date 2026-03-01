import { cn, getPathColor } from '~/lib/utils'

interface PathDisplayProps {
  path: string
  className?: string
  segmentClassName?: string
  onClickSegment?: (partialPath: string) => void
}

export function PathDisplay({ path, className, segmentClassName, onClickSegment }: PathDisplayProps) {
  const segments = path.split('/').filter(Boolean)
  
  return (
    <div className={cn("flex min-w-0 items-center overflow-hidden font-mono", className)}>
      {/* ROOT */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClickSegment?.('')
        }}
        className={cn(
          "px-1 rounded hover:bg-muted font-bold transition-all",
          segments.length === 0 ? "text-primary" : "text-muted-foreground/40",
          segmentClassName
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
          <div key={idx} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClickSegment?.(partialPath)
              }}
              className={cn(
                "px-0.5 md:px-1 py-0.5 rounded transition-all whitespace-nowrap",
                isLast ? "font-bold opacity-90" : "text-muted-foreground/60 hover:text-foreground hover:bg-muted",
                segmentClassName
              )}
              style={{ color: isLast ? color : undefined }}
            >
              {segment}
            </button>
            <span className="text-muted-foreground/20 px-0.5 select-none opacity-60">/</span>
          </div>
        )
      })}
    </div>
  )
}
