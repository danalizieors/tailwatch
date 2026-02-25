/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import appCss from '~/styles/app.css?url'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' },
      { title: 'Tailwatch | Event Monitor' },
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
  // Register Service Worker for PWA
  useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased selection:bg-primary/30 h-screen w-screen overflow-hidden bg-background text-foreground flex">
        <ConvexProvider client={convex}>
          <Outlet />
        </ConvexProvider>
        {typeof document !== 'undefined' ? <TanStackRouterDevtools position="bottom-right" /> : null}
        <Scripts />
      </body>
    </html>
  )
}
