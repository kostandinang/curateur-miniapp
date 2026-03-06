import { execSync } from 'node:child_process'

/** Execute a shell command safely, returning empty string on failure */
export function execSafe(cmd: string, timeoutMs = 5000): string {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: timeoutMs }).trim()
  } catch {
    return ''
  }
}

/** Format bytes into a human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}
