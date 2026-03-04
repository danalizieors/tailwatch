import {
  Apple,
  Chromium,
  Compass,
  Globe,
  Laptop,
  Monitor,
  Smartphone,
  Terminal,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '~/lib/utils'

type DeviceBrandKind = 'os' | 'browser'

interface DeviceBrandIconProps {
  kind: DeviceBrandKind
  name?: string
  className?: string
}

type BrandMatch = {
  slug?: string
  label: string
  fallback: LucideIcon
}

function resolveOSBrand(rawName?: string): BrandMatch {
  const name = (rawName || '').toLowerCase()

  if (
    name.includes('mac') ||
    name.includes('ios') ||
    name.includes('iphone') ||
    name.includes('ipad') ||
    name.includes('apple')
  ) {
    return { slug: 'apple', label: 'Apple', fallback: Apple }
  }

  if (name.includes('win')) {
    return { slug: 'windows11', label: 'Windows', fallback: Laptop }
  }

  if (name.includes('android')) {
    return { slug: 'android', label: 'Android', fallback: Smartphone }
  }

  if (name.includes('ubuntu')) {
    return { slug: 'ubuntu', label: 'Ubuntu', fallback: Terminal }
  }

  if (name.includes('debian')) {
    return { slug: 'debian', label: 'Debian', fallback: Terminal }
  }

  if (name.includes('fedora')) {
    return { slug: 'fedora', label: 'Fedora', fallback: Terminal }
  }

  if (name.includes('linux')) {
    return { slug: 'linux', label: 'Linux', fallback: Terminal }
  }

  return { label: rawName || 'Device', fallback: Monitor }
}

function resolveBrowserBrand(rawName?: string): BrandMatch {
  const name = (rawName || '').toLowerCase()

  if (name.includes('edge')) {
    return {
      slug: 'microsoftedge',
      label: 'Microsoft Edge',
      fallback: Globe,
    }
  }

  if (name.includes('firefox')) {
    return {
      slug: 'firefoxbrowser',
      label: 'Firefox',
      fallback: Globe,
    }
  }

  if (name.includes('opera')) {
    return { slug: 'opera', label: 'Opera', fallback: Globe }
  }

  if (name.includes('safari')) {
    return { slug: 'safari', label: 'Safari', fallback: Compass }
  }

  if (name.includes('brave')) {
    return { slug: 'brave', label: 'Brave', fallback: Globe }
  }

  if (name.includes('samsung')) {
    return {
      slug: 'samsunginternet',
      label: 'Samsung Internet',
      fallback: Globe,
    }
  }

  if (name.includes('chrome') || name.includes('chromium')) {
    return {
      slug: 'googlechrome',
      label: 'Google Chrome',
      fallback: Chromium,
    }
  }

  return { label: rawName || 'Browser', fallback: Globe }
}

function resolveBrand(kind: DeviceBrandKind, name?: string): BrandMatch {
  return kind === 'os' ? resolveOSBrand(name) : resolveBrowserBrand(name)
}

export function DeviceBrandIcon({
  kind,
  name,
  className,
}: DeviceBrandIconProps) {
  const [hasLoadError, setHasLoadError] = useState(false)
  const brand = useMemo(() => resolveBrand(kind, name), [kind, name])

  useEffect(() => {
    setHasLoadError(false)
  }, [brand.slug, brand.label])

  if (brand.slug && !hasLoadError) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${brand.slug}`}
        alt={brand.label}
        title={brand.label}
        loading='lazy'
        decoding='async'
        referrerPolicy='no-referrer'
        className={cn('shrink-0 object-contain', className)}
        onError={() => setHasLoadError(true)}
      />
    )
  }

  const FallbackIcon = brand.fallback
  return (
    <FallbackIcon
      className={cn('shrink-0', className)}
      aria-label={brand.label}
    />
  )
}
