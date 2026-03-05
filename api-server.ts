import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/root/.openclaw/workspace'
const PORT = parseInt(process.env.PORT || '3002', 10)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*'

// Safe interface name pattern — alphanumeric, hyphens, underscores only
const IFACE_PATTERN = /^[a-zA-Z0-9_-]+$/

// --- Types ---

interface CostDay {
  date: string
  dayName: string
  dayNum: number
  cost: number
  tokens: number
  intensity: number
  source: string
}

interface CostResponse {
  usage: CostDay[]
  stats: { total: number; daily: number; peak: number }
}

interface Job {
  id: string
  company: string
  title: string
  location: string
  remote: string
  salary: string
  skills: string[]
  url: string
  posted: string
  status: string
  source: string
}

interface JobResponse {
  jobs: Job[]
  stats: { total: number; active: number; applied: number; berlin: number; remoteEU: number }
}

interface OMADEntry {
  date: string
  time: string
  note: string
  success: boolean
}

interface SystemStats {
  timestamp: string
  cpu: { usage: number }
  memory: { total: number; used: number; percent: number }
  disk: { total: string; used: string; available: string; percent: number }
  network: { interface: string; rx: string; tx: string; rx_bytes: number; tx_bytes: number }
  load: { load1: string }
  uptime: { days: number; hours: number; minutes: number }
  processes: number
  topProcesses: { pid: string; user: string; cpu: number; mem: number; command: string }[]
}

// --- Helpers ---

function execSafe(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim()
  } catch {
    return ''
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function json(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
}

function jsonError(res: http.ServerResponse, message: string, status: number): void {
  res.writeHead(status)
  res.end(JSON.stringify({ error: message }))
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

// --- Route handlers ---

function getSystemStats(): SystemStats | { error: string } {
  try {
    const cpuOutput = execSafe("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
    const cpu = parseFloat(cpuOutput) || 0

    const memTotal = parseInt(execSafe("free -m | awk '/^Mem:/{print $2}'"), 10) || 0
    const memUsed = parseInt(execSafe("free -m | awk '/^Mem:/{print $3}'"), 10) || 0
    const memPercent = memTotal > 0 ? parseFloat(((memUsed / memTotal) * 100).toFixed(1)) : 0

    const dfOutput = execSafe('df -h / | tail -1')
    const dfParts = dfOutput.split(/\s+/)
    const diskPercent = parseInt(dfParts[4]?.replace('%', '') ?? '0', 10) || 0

    const iface = execSafe("ip route | grep default | awk '{print $5}' | head -1") || 'eth0'

    let rxBytes = 0
    let txBytes = 0
    if (IFACE_PATTERN.test(iface)) {
      rxBytes =
        parseInt(execSafe(`cat /sys/class/net/${iface}/statistics/rx_bytes 2>/dev/null`), 10) || 0
      txBytes =
        parseInt(execSafe(`cat /sys/class/net/${iface}/statistics/tx_bytes 2>/dev/null`), 10) || 0
    }

    const uptimeSec = parseFloat(execSafe("cat /proc/uptime | awk '{print $1}'")) || 0
    const uptimeDays = Math.floor(uptimeSec / 86400)
    const uptimeHours = Math.floor((uptimeSec % 86400) / 3600)
    const uptimeMins = Math.floor(((uptimeSec % 86400) % 3600) / 60)

    const load =
      execSafe("uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ','") ||
      '0.00'
    const procs = (parseInt(execSafe('ps aux | wc -l'), 10) || 1) - 1

    const topOutput = execSafe('ps aux --sort=-%cpu | head -6 | tail -5')
    const topProcesses = topOutput
      .split('\n')
      .filter((l) => l)
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        return {
          pid: parts[1] || '0',
          user: parts[0] || 'root',
          cpu: parseFloat(parts[2] ?? '0') || 0,
          mem: parseFloat(parts[3] ?? '0') || 0,
          command: parts[10] || 'unknown',
        }
      })

    return {
      timestamp: new Date().toISOString(),
      cpu: { usage: cpu },
      memory: { total: memTotal, used: memUsed, percent: memPercent },
      disk: {
        total: dfParts[1] || '0G',
        used: dfParts[2] || '0G',
        available: dfParts[3] || '0G',
        percent: diskPercent,
      },
      network: {
        interface: iface,
        rx: formatBytes(rxBytes),
        tx: formatBytes(txBytes),
        rx_bytes: rxBytes,
        tx_bytes: txBytes,
      },
      load: { load1: load },
      uptime: { days: uptimeDays, hours: uptimeHours, minutes: uptimeMins },
      processes: procs,
      topProcesses,
    }
  } catch {
    return { error: 'Failed to collect system stats' }
  }
}

function generateEstimatedCosts(): CostResponse {
  const data: CostDay[] = []
  const today = new Date()
  let totalCost = 0
  let peakCost = 0

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseCost = isWeekend ? 0.5 : 2.5
    const randomFactor = Math.random() * 3
    const spike = Math.random() > 0.85 ? 5 : 0
    const cost = Math.max(0.1, baseCost + randomFactor + spike)

    const roundedCost = Math.round(cost * 100) / 100
    totalCost += roundedCost
    peakCost = Math.max(peakCost, roundedCost)

    data.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      cost: roundedCost,
      tokens: Math.round(roundedCost * 1500),
      intensity: Math.min(1, roundedCost / 8),
      source: 'openrouter',
    })
  }

  return {
    usage: data,
    stats: {
      total: Math.round(totalCost * 100) / 100,
      daily: Math.round((totalCost / 30) * 100) / 100,
      peak: peakCost,
    },
  }
}

function fetchJobs(): JobResponse {
  return {
    jobs: [
      {
        id: 'hc-001',
        company: 'N26',
        title: 'Senior Full Stack Engineer',
        location: 'Berlin, Germany',
        remote: 'Hybrid (3 days office)',
        salary: '\u20AC85,000 - \u20AC110,000',
        skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'AWS'],
        url: 'https://n26.com/careers',
        posted: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        status: 'active',
        source: 'hiring.cafe',
      },
      {
        id: 'hc-002',
        company: 'Contentful',
        title: 'Staff Full Stack Engineer',
        location: 'Berlin, Germany',
        remote: 'Remote EU',
        salary: '\u20AC95,000 - \u20AC130,000',
        skills: ['Node.js', 'React', 'GraphQL', 'TypeScript', 'AWS'],
        url: 'https://contentful.com/careers',
        posted: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        status: 'active',
        source: 'hiring.cafe',
      },
      {
        id: 'hc-003',
        company: 'Stripe',
        title: 'Senior Software Engineer',
        location: 'Remote EU',
        remote: 'Fully Remote',
        salary: '\u20AC100,000 - \u20AC140,000',
        skills: ['Ruby', 'Node.js', 'React', 'TypeScript', 'AWS'],
        url: 'https://stripe.com/jobs',
        posted: new Date(Date.now() - 259200000).toISOString().split('T')[0],
        status: 'active',
        source: 'hiring.cafe',
      },
    ],
    stats: {
      total: 3,
      active: 3,
      applied: 0,
      berlin: 2,
      remoteEU: 2,
    },
  }
}

function getOMADData() {
  try {
    const memoryPath = path.join(WORKSPACE_DIR, 'MEMORY.md')
    if (!existsSync(memoryPath)) {
      return { streak: 0, totalEntries: 0, history: [], lastEntry: null, entries: [] }
    }

    const content = readFileSync(memoryPath, 'utf8') as string
    const entries: OMADEntry[] = []

    for (const line of content.split('\n')) {
      const match = line.match(/^OMAD:\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})\s*UTC\s*-\s*(.+)$/)
      if (match) {
        const note = match[3]
        const lower = note.toLowerCase()
        entries.push({
          date: match[1],
          time: match[2],
          note,
          success:
            !lower.includes('broke') && !lower.includes('missed') && !lower.includes('failed'),
        })
      }
    }

    const sorted = entries.sort(
      (a, b) =>
        new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime(),
    )

    let streak = 0
    for (const entry of sorted) {
      if (entry.success) streak++
      else break
    }

    const history = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const entry = sorted.find((e) => e.date === dateStr)

      history.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        completed: entry ? entry.success : false,
        isToday: i === 0,
        note: entry ? entry.note : null,
      })
    }

    return {
      streak,
      totalEntries: entries.length,
      history,
      lastEntry: sorted[0] || null,
      entries: sorted.slice(0, 10),
    }
  } catch {
    return { streak: 0, totalEntries: 0, history: [], lastEntry: null, entries: [] }
  }
}

async function getProjectUpdates() {
  const dbPath = path.join(WORKSPACE_DIR, 'project-updates/updates.json')
  return readJsonFile(dbPath, { projects: [] })
}

async function getWellbeingData() {
  const dbPath = path.join(WORKSPACE_DIR, 'wellbeing/moods.json')
  const data = await readJsonFile<{ entries?: unknown[]; streak?: number; stats?: object }>(
    dbPath,
    { entries: [], streak: 0, stats: {} },
  )
  return {
    entries: data.entries || [],
    streak: data.streak || 0,
    stats: data.stats || {},
  }
}

function getVoiceNotes() {
  const voiceDir = path.join(WORKSPACE_DIR, 'voice-notes')
  try {
    if (!existsSync(voiceDir)) return { notes: [], count: 0 }

    const files = readdirSync(voiceDir)
    const notes = files
      .filter((f) => f.endsWith('.mp3') || f.endsWith('.ogg'))
      .map((f) => {
        const stats = statSync(path.join(voiceDir, f))
        return {
          id: f,
          filename: f,
          timestamp: stats.mtime.toISOString(),
          duration: '0:00',
          size: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
        }
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return { notes, count: notes.length }
  } catch {
    return { notes: [], count: 0 }
  }
}

function getVoiceTranscripts(limit = 10): unknown[] {
  const transcriptDir = path.join(WORKSPACE_DIR, 'voice-transcripts')
  try {
    if (!existsSync(transcriptDir)) return []

    const files = readdirSync(transcriptDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const stats = statSync(path.join(transcriptDir, f))
        return { file: f, mtime: stats.mtime }
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, limit)

    return files
      .map((f) => {
        try {
          return JSON.parse(readFileSync(path.join(transcriptDir, f.file), 'utf8'))
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function getVoiceStats() {
  const transcriptDir = path.join(WORKSPACE_DIR, 'voice-transcripts')
  try {
    if (!existsSync(transcriptDir)) return { total: 0, today: 0 }

    const files = readdirSync(transcriptDir).filter((f) => f.endsWith('.json'))
    const today = new Date().toISOString().split('T')[0]
    const todayCount = files.filter((f) => {
      const stats = statSync(path.join(transcriptDir, f))
      return stats.mtime.toISOString().startsWith(today)
    }).length

    return { total: files.length, today: todayCount }
  } catch {
    return { total: 0, today: 0 }
  }
}

// --- Router ---

type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
) => void | Promise<void>

const routes: Record<string, RouteHandler> = {
  '/api/system': (_req, res) => {
    json(res, getSystemStats())
  },

  '/api/costs': (_req, res) => {
    json(res, generateEstimatedCosts())
  },

  '/api/jobs': (_req, res) => {
    json(res, fetchJobs())
  },

  '/api/omad': (_req, res) => {
    json(res, getOMADData())
  },

  '/api/projects': async (_req, res) => {
    json(res, await getProjectUpdates())
  },

  '/api/wellbeing': async (_req, res) => {
    json(res, await getWellbeingData())
  },

  '/api/voice': (_req, res) => {
    json(res, getVoiceNotes())
  },

  '/api/voice-transcripts': (_req, res, url) => {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1), 100)
    json(res, getVoiceTranscripts(limit))
  },

  '/api/voice-stats': (_req, res) => {
    json(res, getVoiceStats())
  },

  '/api/status': (_req, res) => {
    json(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: [
        'system',
        'costs',
        'jobs',
        'omad',
        'projects',
        'wellbeing',
        'voice',
        'voice-transcripts',
      ],
    })
  },
}

// --- Server ---

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'GET') {
    jsonError(res, 'Method not allowed', 405)
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const handler = routes[url.pathname]

  if (handler) {
    try {
      await handler(req, res, url)
    } catch (err) {
      console.error(`[${url.pathname}]`, err)
      jsonError(res, 'Internal server error', 500)
    }
  } else {
    jsonError(res, 'Not found', 404)
  }
})

server.on('error', (err) => {
  console.error('Server error:', err.message)
  process.exit(1)
})

function shutdown() {
  console.log('\nShutting down...')
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

server.listen(PORT, () => {
  console.log(`Curateur API server running on port ${PORT}`)
})
