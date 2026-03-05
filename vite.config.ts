import { execSync } from 'node:child_process'

import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsConfigPaths from 'vite-tsconfig-paths'

function resolveCommitHash() {
  try {
    return execSync('git rev-parse --short=12 HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    const fallback =
      process.env.GITHUB_SHA ||
      process.env.CI_COMMIT_SHA ||
      process.env.COMMIT_SHA
    return fallback ? String(fallback).slice(0, 12) : 'unknown'
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const commitHash = resolveCommitHash()

  return {
    define: {
      'import.meta.env.VITE_APP_COMMIT_SHA': JSON.stringify(commitHash),
    },
    server: {
      port: 3000,
      allowedHosts: env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(',')
        : undefined,
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tsConfigPaths(),
      tanstackStart({
        prerender: {
          enabled: true,
          autoStaticPathsDiscovery: false,
          crawlLinks: false,
        },
      }),
      viteReact(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        manifest: {
          id: '/',
          name: 'Tailwatch',
          short_name: 'Tailwatch',
          description:
            'Hierarchical event, task, and message dashboard with log and status views.',
          lang: 'en',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#1a1410',
          theme_color: '#1a1410',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
  }
})
