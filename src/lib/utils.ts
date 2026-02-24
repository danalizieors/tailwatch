import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a stable OKLCH color based on a string hash.
 * Uses a curated "Interesting" range of hues (avoiding standard tech blue)
 * and ensures perceptually uniform brightness.
 */
export function getPathColor(path: string) {
  let hash = 0
  for (let i = 0; i < path.length; i++) {
    hash = path.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Use a more sophisticated hue range
  // We want to avoid "standard" blues (240-260) and maybe standard greens (120-140) 
  // to keep it feeling custom and "high-end".
  const rawHue = Math.abs(hash) % 360
  
  let h = rawHue
  // Avoid the "blue/indigo" dead zone for this theme
  if (h > 210 && h < 280) h = (h + 100) % 360
  // Avoid the "standard lime green" to keep it unique
  if (h > 100 && h < 140) h = (h + 60) % 360

  // L = 0.85 (Extremely bright), C = 0.3 (Maximum saturation for high pop)
  return `oklch(0.85 0.3 ${h})`
}
