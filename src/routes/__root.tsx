/// <reference types="vite/client" />
import { useEffect } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import appCss from '~/styles/app.css?url'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { DeviceRegistrationBootstrap } from '~/components/device/device-registration-bootstrap'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Tailwatch | Event Monitor' },
      { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
      { name: 'googlebot', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
      {
        name: 'description',
        content: 'Hierarchical event, task, and message dashboard with log and status views.',
      },
      { name: 'theme-color', content: '#1a1410' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/pwa-192x192.png' },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  useEffect(() => {
    console.info(`[Tailwatch] build ${import.meta.env.VITE_APP_COMMIT_SHA || 'unknown'}`)

    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker
      .register('/tailwatch-sw.js')
      .then((registration) => {
        console.log('SW Registered:', registration)
      })
      .catch((error) => {
        console.error('SW registration error', error)
      })
  }, [])

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased selection:bg-primary/30 min-h-dvh w-full min-w-0 overflow-x-hidden bg-background text-foreground flex">
        <ConvexAuthProvider client={convex}>
          <DeviceRegistrationBootstrap />
          <Outlet />
        </ConvexAuthProvider>
        {typeof document !== 'undefined' ? <TanStackRouterDevtools position="bottom-right" /> : null}
        <Scripts />
      </body>
    </html>
  )
}
