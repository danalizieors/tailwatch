import type { ReactNode } from 'react'

interface PublicPageShellProps {
  children: ReactNode
}

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className='scroll-thin relative flex min-h-dvh w-full min-w-0 flex-1 overflow-x-hidden'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='bg-primary/10 absolute -top-40 -left-48 h-72 w-72 rounded-full blur-3xl' />
        <div className='bg-info/10 absolute top-32 -right-32 h-64 w-64 rounded-full blur-3xl' />
        <div className='bg-primary/5 absolute bottom-0 left-1/2 h-80 w-full -translate-x-1/2 rounded-full blur-3xl' />
      </div>

      <div className='relative z-10 flex w-full min-w-0 flex-col'>
        {children}
      </div>
    </div>
  )
}
