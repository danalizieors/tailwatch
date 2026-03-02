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
  
  // Golden Ratio Hue Distribution
  // Multiplying by the golden ratio conjugate (~0.618) ensures that 
  // hues are spread as far apart as possible across the spectrum.
  const phiConjugate = 0.618033988749895
  const h = (Math.abs(hash) * phiConjugate * 360) % 360
  
  // Maintain the "Jewel Tone" look but add slight variations in 
  // Lightness and Chroma based on the hash to help differentiate similar hues.
  const l = 0.82 + (Math.abs(hash >> 4) % 6) / 100   // Range: 0.82 - 0.88
  const c = 0.28 + (Math.abs(hash >> 8) % 10) / 100  // Range: 0.28 - 0.38

  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(2)})`
}

/**
 * Generates a stable color for volume names. Prefixing with `volume:`
 * keeps volume colors independent from regular path hashing.
 */
export function getVolumeColor(name: string) {
  return getPathColor(`volume:${name}`)
}
