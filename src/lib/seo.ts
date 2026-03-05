const DEFAULT_SITE_URL = 'https://tailwatch.dev'

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_SITE_URL

  try {
    const parsed = new URL(trimmed)
    const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`
    return base.replace(/\/+$/, '') || DEFAULT_SITE_URL
  } catch {
    return DEFAULT_SITE_URL
  }
}

const siteUrl = normalizeSiteUrl(import.meta.env.VITE_SITE_URL ?? DEFAULT_SITE_URL)

function absoluteUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (normalizedPath === '/') return siteUrl
  return `${siteUrl}${normalizedPath}`
}

interface PublicPageHeadOptions {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
}

export function buildPublicPageHead(options: PublicPageHeadOptions) {
  const canonicalUrl = absoluteUrl(options.path)
  const ogType = options.type ?? 'website'

  return {
    meta: [
      { title: options.title },
      { name: 'description', content: options.description },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:site_name', content: 'Tailwatch' },
      { property: 'og:type', content: ogType },
      { property: 'og:title', content: options.title },
      { property: 'og:description', content: options.description },
      { property: 'og:url', content: canonicalUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: options.title },
      { name: 'twitter:description', content: options.description },
    ],
    links: [{ rel: 'canonical', href: canonicalUrl }],
  }
}

interface NoIndexPageHeadOptions {
  title: string
  description?: string
}

export function buildNoIndexPageHead(options: NoIndexPageHeadOptions) {
  const meta: Array<Record<string, string>> = [
    { title: options.title },
    { name: 'robots', content: 'noindex, nofollow, noarchive' },
    { name: 'googlebot', content: 'noindex, nofollow, noarchive' },
  ]

  if (options.description) {
    meta.splice(1, 0, { name: 'description', content: options.description })
  }

  return { meta }
}
