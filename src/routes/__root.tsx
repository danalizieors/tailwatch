/// <reference types="vite/client" />
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Terminal } from 'lucide-react'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Tailwatch | Event Monitor' },
      {
        name: 'description',
        content: 'Hierarchical event, task, and message dashboard with log and status views.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased selection:bg-primary/30">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-4 md:px-8">
              <div className="flex items-center gap-3 mr-8">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Terminal className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-none tracking-tight text-foreground">Tailwatch</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Monitor</span>
                </div>
              </div>
              <nav className="flex items-center gap-6 text-sm font-medium">
                <Link
                  to="/"
                  activeProps={{ className: 'text-foreground' }}
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  Log Stream
                </Link>
                <Link
                  to="/status"
                  activeProps={{ className: 'text-foreground' }}
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  Status Board
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 2xl:px-12 w-full mx-auto max-w-[1920px]">
            <Outlet />
          </main>
        </div>
        {typeof document !== 'undefined' ? <TanStackRouterDevtools position="bottom-right" /> : null}
        <Scripts />
      </body>
    </html>
  )
}
