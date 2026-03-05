/// <reference types="vite/client" />
import '~/styles/app.css'

import { ConvexAuthProvider } from '@convex-dev/auth/react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ConvexReactClient } from 'convex/react'
import { useEffect } from 'react'
import { DeviceRegistrationBootstrap } from '~/components/device/device-registration-bootstrap'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Tailwatch' },
      {
        name: 'description',
        content:
          'Tailwatch gives you real-time event streams, status boards, and push alerts for human-in-the-loop workflows.',
      },
      { name: 'theme-color', content: '#1a1410' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/pwa-192x192.png' },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  useEffect(() => {
    console.info(
      `[Tailwatch] build ${import.meta.env.VITE_APP_COMMIT_SHA || 'unknown'}`,
    )

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (!window.isSecureContext) {
        console.warn(
          '[Tailwatch] Service Worker registration skipped: Not a secure context',
        )
        return
      }

      // Manual registration with classic type for better browser/environment compatibility
      navigator.serviceWorker
        .register('/sw.js', {
          type: 'classic',
          scope: '/',
        })
        .then((registration) => {
          console.log('SW Registered successfully:', registration)
        })
        .catch((error) => {
          console.error('SW registration error:', error)
          // Alert specifically for insecure or 404 errors during transition
          if (error.name !== 'AbortError') {
            alert(
              `Service Worker registration failed: ${error.message || error}`,
            )
          }
        })
    }
  }, [])

  return (
    <html lang='en' className='dark'>
      <head>
        <HeadContent />
      </head>
      <body className='selection:bg-primary/30 bg-background text-foreground flex min-h-dvh w-full min-w-0 overflow-x-hidden antialiased'>
        <ConvexAuthProvider client={convex}>
          <DeviceRegistrationBootstrap />
          <Outlet />
        </ConvexAuthProvider>
        {typeof document !== 'undefined' ? (
          <TanStackRouterDevtools position='bottom-right' />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
