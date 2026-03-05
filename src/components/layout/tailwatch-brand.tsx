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
        <div className='flex min-w-0 items-start gap-0.5'>
          <span className='text-foreground block truncate text-[1.06rem] font-semibold tracking-normal'>
            Tailwatch
          </span>
          <span className='border-info/35 bg-info/15 text-info inline-flex h-4 -translate-y-1 items-center rounded-full border px-1.5 text-[0.52rem] font-semibold tracking-wide uppercase'>
            alpha
          </span>
        </div>
      </div>
    </div>
  )
}
