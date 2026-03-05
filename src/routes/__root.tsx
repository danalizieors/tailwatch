/// <reference types="vite/client" />
import '~/styles/app.css'

import { ConvexAuthProvider } from '@convex-dev/auth/react'
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouterState,
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
        content: 'Hierarchical event monitor with push notifications',
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
      { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'shortcut icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'mask-icon', href: '/icon.svg', color: '#f47f46' },
    ],
  }),
  component: RootDocument,
  notFoundComponent: RootNotFound,
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
    <html lang='en' className='dark overflow-x-hidden'>
      <head>
        <HeadContent />
      </head>
      <body className='selection:bg-primary/30 bg-background text-foreground flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden antialiased'>
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

function RootNotFound() {
  const { location } = useRouterState()
  const requestedPath = `${location.pathname}${location.search}${location.hash}`

  return (
    <main className='mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6'>
      <p className='text-primary text-xs font-semibold tracking-[0.18em] uppercase'>
        404
      </p>
      <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
        Page not found
      </h1>
      <code className='border-border/60 bg-card/40 text-foreground block max-w-full overflow-x-auto rounded-lg border px-3 py-2 text-left font-mono text-xs sm:text-sm'>
        {requestedPath || '/'}
      </code>
      <Link
        to='/'
        className='bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-opacity hover:opacity-90'
      >
        Back to Home
      </Link>
    </main>
  )
}
