/// <reference types="vite/client" />
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Tailwatch' },
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="mx-auto min-h-screen max-w-[1440px] px-4 py-6 md:px-6">
          <header className="mb-6 rounded-2xl border border-white/60 bg-white/75 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tailwatch</p>
                <h1 className="text-2xl font-semibold tracking-tight">Realtime Hierarchical Event Monitor</h1>
              </div>
              <nav className="flex items-center gap-2">
                <Link
                  to="/"
                  activeProps={{ className: 'bg-primary text-primary-foreground' }}
                  className="rounded-md border px-3 py-2 text-sm font-medium"
                >
                  Log Stream
                </Link>
                <Link
                  to="/status"
                  activeProps={{ className: 'bg-primary text-primary-foreground' }}
                  className="rounded-md border px-3 py-2 text-sm font-medium"
                >
                  Status Board
                </Link>
              </nav>
            </div>
          </header>
          <main>
            <Outlet />
          </main>
        </div>
        {typeof document !== 'undefined' ? <TanStackRouterDevtools position="bottom-right" /> : null}
        <Scripts />
      </body>
    </html>
  )
}
