const DEFAULT_SITE_URL = 'https://tailwatch.dev'
const DEFAULT_ORGANIZATION_NAME = 'Tailwatch'
const DEFAULT_ORGANIZATION_LOGO_PATH = '/android-chrome-512x512.png'

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

const siteUrl = normalizeSiteUrl(DEFAULT_SITE_URL)

function absoluteUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (normalizedPath === '/') return siteUrl
  return `${siteUrl}${normalizedPath}`
}

function buildOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: DEFAULT_ORGANIZATION_NAME,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(DEFAULT_ORGANIZATION_LOGO_PATH),
      width: 512,
      height: 512,
    },
    image: absoluteUrl(DEFAULT_ORGANIZATION_LOGO_PATH),
  }
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
  const organizationStructuredData = buildOrganizationStructuredData()
  const previewImageUrl = absoluteUrl(DEFAULT_ORGANIZATION_LOGO_PATH)

  return {
    meta: [
      { title: options.title },
      { name: 'description', content: options.description },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:site_name', content: DEFAULT_ORGANIZATION_NAME },
      { property: 'og:type', content: ogType },
      { property: 'og:title', content: options.title },
      { property: 'og:description', content: options.description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: previewImageUrl },
      { property: 'og:image:secure_url', content: previewImageUrl },
      { property: 'og:image:width', content: '512' },
      { property: 'og:image:height', content: '512' },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:alt', content: `${DEFAULT_ORGANIZATION_NAME} logo` },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: options.title },
      { name: 'twitter:description', content: options.description },
      { name: 'twitter:image', content: previewImageUrl },
      { 'script:ld+json': organizationStructuredData },
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
