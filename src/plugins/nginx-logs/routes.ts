import { Hono } from 'hono'
import { execSync } from 'node:child_process'

interface AccessLogEntry {
  ip: string
  timestamp: string
  method: string
  path: string
  status: number
  size: number
  referer: string
  userAgent: string
  raw: string
}

interface ErrorLogEntry {
  timestamp: string
  level: string
  message: string
  raw: string
}

// Combined nginx log format regex
const ACCESS_RE =
  /^(\S+) \S+ \S+ \[([^\]]+)] "(\S+) (\S+) \S+" (\d{3}) (\d+) "([^"]*)" "([^"]*)"/

const ERROR_RE =
  /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)] (.+)/

const ACCESS_LOG = process.env.NGINX_ACCESS_LOG || '/var/log/nginx/access.log'
const ERROR_LOG = process.env.NGINX_ERROR_LOG || '/var/log/nginx/error.log'

function tailFile(filePath: string, lines: number): string {
  try {
    return execSync(`tail -n ${lines} ${filePath}`, {
      encoding: 'utf8',
      timeout: 5000,
    })
  } catch {
    return ''
  }
}

function parseAccessLog(raw: string): AccessLogEntry[] {
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = ACCESS_RE.exec(line)
      if (!m) return null
      return {
        ip: m[1],
        timestamp: m[2],
        method: m[3],
        path: m[4],
        status: parseInt(m[5], 10),
        size: parseInt(m[6], 10),
        referer: m[7] === '-' ? '' : m[7],
        userAgent: m[8],
        raw: line,
      }
    })
    .filter((e): e is AccessLogEntry => e !== null)
    .reverse()
}

function parseErrorLog(raw: string): ErrorLogEntry[] {
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = ERROR_RE.exec(line)
      if (!m) return { timestamp: '', level: 'info', message: line, raw: line }
      return {
        timestamp: m[1],
        level: m[2],
        message: m[3],
        raw: line,
      }
    })
    .reverse()
}

const router = new Hono()

router.get('/', (c) => {
  const type = c.req.query('type') || 'access'
  const lines = Math.min(parseInt(c.req.query('lines') || '100', 10), 1000)

  if (type === 'error') {
    const raw = tailFile(ERROR_LOG, lines)
    const entries = parseErrorLog(raw)
    return c.json({ type: 'error', entries, count: entries.length })
  }

  const raw = tailFile(ACCESS_LOG, lines)
  const entries = parseAccessLog(raw)

  // Compute quick stats
  const statusCounts: Record<string, number> = {}
  for (const e of entries) {
    const group = `${Math.floor(e.status / 100)}xx`
    statusCounts[group] = (statusCounts[group] || 0) + 1
  }

  // Top paths
  const pathCounts: Record<string, number> = {}
  for (const e of entries) {
    pathCounts[e.path] = (pathCounts[e.path] || 0) + 1
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }))

  return c.json({ type: 'access', entries, count: entries.length, statusCounts, topPaths })
})

export default router
