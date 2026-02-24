import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPathColor(path: string) {
  let hash = 0
  for (let i = 0; i < path.length; i++) {
    hash = path.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  // L = 0.72, C = 0.14, H = dynamic (stable based on hash)
  return `oklch(0.72 0.14 ${h})`
}

