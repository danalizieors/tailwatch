type ProcessEnv = Record<string, string | undefined>

export function getProcessEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: ProcessEnv } }).process?.env
  const value = env?.[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

