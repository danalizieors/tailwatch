import { Terminal } from 'lucide-react'
import { cn } from '~/lib/utils'

interface TailwatchBrandProps {
  className?: string
}

export function TailwatchBrand({ className }: TailwatchBrandProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 shrink items-center gap-2.5 rounded-lg',
        className,
      )}
    >
      <div className='border-primary/25 bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl border'>
        <Terminal className='h-[18px] w-[18px]' />
      </div>
      <div className='min-w-0 leading-none'>
        <span className='text-foreground block truncate text-[1.06rem] font-semibold tracking-normal'>
          Tailwatch
        </span>
      </div>
    </div>
  )
}
