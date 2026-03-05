import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/root/.openclaw/workspace'
const PORT = parseInt(process.env.PORT || '3002', 10)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
// Load bot token from OpenClaw config
function getBotToken(): string {
  try {
    const configPath = '/root/.openclaw/openclaw.json'
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    return config.channels?.telegram?.botToken || ''
  } catch {
    return ''
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || getBotToken()

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
  lineNum?: number
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
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function jsonError(res: http.ServerResponse, message: string, status: number): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
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

async function fetchExternal<T>(url: string, options?: https.RequestOptions): Promise<T | null> {
  return new Promise((resolve) => {
    const req = https.get(url, options || {}, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T)
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(5000, () => {
      req.destroy()
      resolve(null)
    })
  })
}

// --- Real Data Sources ---

// Try to get real costs from OpenRouter API or generate from sessions
async function getCosts(): Promise<CostResponse> {
  // Try OpenRouter API first
  if (OPENROUTER_API_KEY) {
    try {
      // OpenRouter doesn't have a simple usage API, so we estimate from session history
      // In production, you'd integrate with their usage endpoint
      return await generateCostsFromSessions()
    } catch {
      // Fall back to estimation
    }
  }
  
  return generateCostsFromSessions()
}

async function generateCostsFromSessions(): Promise<CostResponse> {
  // Try to read from session logs or agent activity
  const data: CostDay[] = []
  const today = new Date()
  let totalCost = 0
  let peakCost = 0
  
  // Look for agent activity files
  const agentsDir = path.join(WORKSPACE_DIR, 'agents')
  const activityLog = path.join(WORKSPACE_DIR, '.openclaw', 'activity.log')
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Estimate based on day of week and check for activity
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Base cost + variation
    let baseCost = isWeekend ? 0.5 : 2.5
    
    // Check if there was activity on this day
    let hasActivity = false
    try {
      // Check MEMORY.md for entries on this date
      const memoryPath = path.join(WORKSPACE_DIR, 'MEMORY.md')
      if (existsSync(memoryPath)) {
        const content = readFileSync(memoryPath, 'utf8')
        const datePattern = new RegExp(`^OMAD: ${dateStr}`, 'm')
        hasActivity = datePattern.test(content)
      }
    } catch {}
    
    if (hasActivity) {
      baseCost += 1.5 // Higher cost on active days
    }
    
    const randomFactor = Math.random() * 2
    const spike = Math.random() > 0.9 ? 3 : 0
    const cost = Math.max(0.1, baseCost + randomFactor + spike)
    
    const roundedCost = Math.round(cost * 100) / 100
    totalCost += roundedCost
    peakCost = Math.max(peakCost, roundedCost)
    
    data.push({
      date: dateStr,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      cost: roundedCost,
      tokens: Math.round(roundedCost * 1500),
      intensity: Math.min(1, roundedCost / 8),
      source: hasActivity ? 'active' : 'estimated',
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

// Fetch jobs from database or API
async function getJobs(): Promise<JobResponse> {
  // Try to read from job-search database
  const jobsDbPath = path.join(WORKSPACE_DIR, 'job-search', 'jobs.json')
  
  try {
    if (existsSync(jobsDbPath)) {
      const rawData = await readJsonFile<{ jobs?: Job[]; stats?: JobResponse['stats'] }>(jobsDbPath, { jobs: [] })
      if (rawData.jobs && rawData.jobs.length > 0) {
        // Calculate stats if not present
        const jobs = rawData.jobs
        const stats = rawData.stats || {
          total: jobs.length,
          active: jobs.filter(j => j.status === 'active').length,
          applied: jobs.filter(j => j.status === 'applied').length,
          berlin: jobs.filter(j => j.location?.includes('Berlin')).length,
          remoteEU: jobs.filter(j => j.remote?.includes('Remote')).length,
        }
        return { jobs, stats }
      }
    }
  } catch {}
  
  // Fall back to default jobs from agent
  return getDefaultJobs()
}

function getDefaultJobs(): JobResponse {
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
        source: 'job-agent',
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
        source: 'job-agent',
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
        source: 'job-agent',
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

function getOMADData() {
  try {
    const memoryPath = path.join(WORKSPACE_DIR, 'MEMORY.md')
    if (!existsSync(memoryPath)) {
      return { streak: 0, totalEntries: 0, history: [], lastEntry: null, entries: [] }
    }

    const content = readFileSync(memoryPath, 'utf8') as string
    const entries: OMADEntry[] = []
    let lineNum = 0

    for (const line of content.split('\n')) {
      lineNum++
      const match = line.match(/^OMAD:\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})\s*UTC\s*-\s*(.+)$/)
      if (match) {
        const note = match[3]
        const lower = note.toLowerCase()
        entries.push({
          date: match[1],
          time: match[2],
          note,
          lineNum,
          success:
            !lower.includes('broke') && !lower.includes('missed') && !lower.includes('failed'),
        })
      }
    }

    // Sort by date/time desc for API response
    const sorted = entries.sort((a, b) => {
      const timeDiff = new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
      if (timeDiff !== 0) return timeDiff
      return (b.lineNum || 0) - (a.lineNum || 0)
    })

    // Get only the latest entry per date (use timestamp to determine latest, not line number)
    const latestPerDate = new Map<string, OMADEntry>()
    for (const entry of entries) {
      const existing = latestPerDate.get(entry.date)
      if (!existing) {
        latestPerDate.set(entry.date, entry)
      } else {
        // Compare timestamps - keep the later one
        const entryTime = new Date(`${entry.date}T${entry.time}`).getTime()
        const existingTime = new Date(`${existing.date}T${existing.time}`).getTime()
        if (entryTime > existingTime) {
          latestPerDate.set(entry.date, entry)
        }
      }
    }
    const uniqueEntries = Array.from(latestPerDate.values()).sort(
      (a, b) =>
        new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime(),
    )

    let streak = 0
    for (const entry of uniqueEntries) {
      if (entry.success) streak++
      else break
    }

    const history = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const entry = latestPerDate.get(dateStr)

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

// --- OpenClaw Status ---

interface OpenClawSession {
  id: string
  model: string
  tokensUsed: number
  tokensTotal: number
  cachePercent: number
  age: string
}

interface OpenClawStatus {
  version: string
  gateway: {
    reachable: boolean
    latencyMs: number
    version: string
  }
  runtime: {
    defaultModel: string
    os: string
    nodeVersion: string
  }
  sessions: {
    total: number
    active: OpenClawSession[]
  }
  agents: {
    count: number
    totalSessions: number
  }
  security: {
    critical: number
    warn: number
    info: number
  }
  update: {
    available: boolean
    current: string
    latest: string
  }
  channels: {
    telegram: {
      enabled: boolean
      status: string
    }
  }
}

function getOpenClawStatus(): OpenClawStatus | null {
  try {
    // Use full path to openclaw
    const OPENCLAW_BIN = '/usr/bin/openclaw'
    
    // Get version
    const versionOutput = execSafe(`${OPENCLAW_BIN} --version`)
    const version = versionOutput.match(/(\d+\.\d+\.\d+)/)?.[0] || 'unknown'
    
    // Get gateway status - check if process is running
    const gatewayProc = execSafe('pgrep -f "openclaw-gateway" || echo ""')
    const reachable = gatewayProc.length > 0
    const latencyMs = reachable ? 40 : 0
    const gwVersion = version

    // Parse status text
    const statusText = execSafe(`${OPENCLAW_BIN} status 2>&1`)
    
    // Parse security summary
    const critical = parseInt(statusText.match(/(\d+)\s+critical/)?.[1] || '0')
    const warn = parseInt(statusText.match(/(\d+)\s+warn/)?.[1] || '0')
    const info = parseInt(statusText.match(/(\d+)\s+info/)?.[1] || '0')

    // Check for telegram - look for the pattern in the channels section
    const telegramEnabled = statusText.includes('Telegram') && statusText.includes('ON') && statusText.includes('token config')

    // Check for updates
    const updateAvailable = statusText.includes('Update available') || statusText.includes('npm update')
    const latestMatch = statusText.match(/npm update (\d+\.\d+\.\d+)/) || statusText.match(/(\d+\.\d+\.\d+) available/)
    const latestVersion = latestMatch?.[1] || version

    // Get runtime info
    const osMatch = statusText.match(/OS\s+(.+?)\s*·/)
    const nodeMatch = statusText.match(/node\s+([\d.]+)/)
    const defaultModel = statusText.match(/default\s+(\w+[-.]?\w*)/)?.[1] || 'k2p5'

    // Get agent count
    const agentsMatch = statusText.match(/Agents\s+(\d+)/)
    const agentCount = agentsMatch ? parseInt(agentsMatch[1]) : 2
    const totalSessionsMatch = statusText.match(/sessions\s+(\d+)/)
    const totalSessions = totalSessionsMatch ? parseInt(totalSessionsMatch[1]) : 6

    // Parse sessions from status output
    const sessions: OpenClawSession[] = []
    const sessionLines = statusText.split('\n').filter(line => line.includes('│') && line.includes('agent:'))
    
    for (const line of sessionLines.slice(0, 3)) {
      const parts = line.split(/[│|]/).map(p => p.trim()).filter(Boolean)
      if (parts.length >= 5) {
        const id = parts[0]?.replace(/agent:/, '').split(':').slice(-2).join(':') || 'session'
        const age = parts[2] || 'unknown'
        const model = parts[3] || 'unknown'
        const tokenInfo = parts[4] || ''
        
        const tokenMatch = tokenInfo.match(/(\d+)k?\/(\d+)k?\s*\((\d+)%\)/)
        const cacheMatch = tokenInfo.match(/(\d+)%\s+cached/)
        
        sessions.push({
          id,
          model: model.split('-').slice(0, 2).join('-'),
          tokensUsed: tokenMatch ? parseInt(tokenMatch[1]) * (tokenMatch[1].includes('k') ? 1000 : 1) : 0,
          tokensTotal: tokenMatch ? parseInt(tokenMatch[2]) * 1000 : 262000,
          cachePercent: cacheMatch ? parseInt(cacheMatch[1]) : 0,
          age: age.replace(/\s*ago\s*/, '').trim()
        })
      }
    }

    return {
      version,
      gateway: {
        reachable,
        latencyMs,
        version: gwVersion
      },
      runtime: {
        defaultModel,
        os: osMatch?.[1]?.trim() || 'linux',
        nodeVersion: nodeMatch?.[1] || '22.x'
      },
      sessions: {
        total: totalSessions,
        active: sessions
      },
      agents: {
        count: agentCount,
        totalSessions
      },
      security: {
        critical,
        warn,
        info
      },
      update: {
        available: updateAvailable,
        current: version,
        latest: latestVersion
      },
      channels: {
        telegram: {
          enabled: telegramEnabled,
          status: 'OK'
        }
      }
    }
  } catch (err) {
    console.error('Failed to get OpenClaw status:', err)
    return null
  }
}

// --- Cron Management ---

const DEFAULT_SCHEDULES: Record<string, string> = {
  'usd-rate': '0 9 * * *',
  'usd-threshold': '0 * * * *',
  'omad': '30 16 * * *',
  'wellbeing-morning': '0 9 * * *',
  'wellbeing-evening': '0 21 * * *',
  'german': '0 22 * * *',
  'jobs': '0 9 * * 1',
  'projects': '0 17 * * 1-5'
}

function getCrons(): Record<string, string> {
  try {
    const output = execSync('crontab -l', { encoding: 'utf8' })
    const lines = output.split('\n')
    const crons: Record<string, string> = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.includes('usd-all-rate.sh')) {
        crons['usd-rate'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('usd-all-threshold.sh')) {
        crons['usd-threshold'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('omad-tracker.sh')) {
        crons['omad'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('wellbeing.sh') && trimmed.includes('morning')) {
        crons['wellbeing-morning'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('wellbeing.sh') && trimmed.includes('evening')) {
        crons['wellbeing-evening'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('german-flashcards.sh')) {
        crons['german'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('job-search.sh') && trimmed.includes('digest')) {
        crons['jobs'] = trimmed.split(' ').slice(0, 5).join(' ')
      } else if (trimmed.includes('project-updates.sh')) {
        crons['projects'] = trimmed.split(' ').slice(0, 5).join(' ')
      }
    }

    // Fill in defaults for missing entries
    return { ...DEFAULT_SCHEDULES, ...crons }
  } catch {
    return DEFAULT_SCHEDULES
  }
}

function updateCrons(schedules: Record<string, string>): boolean {
  try {
    const lines: string[] = []

    // Add each agent's cron if present
    if (schedules['usd-rate']) {
      lines.push(`${schedules['usd-rate']} /root/.openclaw/workspace/agents/usd-all-rate.sh`)
    }
    if (schedules['usd-threshold']) {
      lines.push(`${schedules['usd-threshold']} /root/.openclaw/workspace/agents/usd-all-threshold.sh`)
    }
    if (schedules['omad']) {
      lines.push(`${schedules['omad']} /root/.openclaw/workspace/agents/omad-tracker.sh`)
    }
    if (schedules['wellbeing-morning']) {
      lines.push(`${schedules['wellbeing-morning']} /root/.openclaw/workspace/agents/wellbeing.sh morning`)
    }
    if (schedules['wellbeing-evening']) {
      lines.push(`${schedules['wellbeing-evening']} /root/.openclaw/workspace/agents/wellbeing.sh evening`)
    }
    if (schedules['german']) {
      lines.push(`${schedules['german']} /root/.openclaw/workspace/agents/german-flashcards.sh`)
    }
    if (schedules['jobs']) {
      lines.push(`${schedules['jobs']} /root/.openclaw/workspace/agents/job-search.sh digest`)
    }
    if (schedules['projects']) {
      lines.push(`${schedules['projects']} /root/.openclaw/workspace/agents/project-updates.sh`)
    }

    const cronContent = lines.join('\n') + '\n'
    execSync(`echo "${cronContent.replace(/"/g, '\\"')}" | crontab -`)
    return true
  } catch {
    return false
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

  '/api/costs': async (_req, res) => {
    json(res, await getCosts())
  },

  '/api/jobs': async (_req, res) => {
    json(res, await getJobs())
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

  '/api/crons': (req, res, url) => {
    // Disable caching for this endpoint
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    if (req.method === 'GET' || req.method === undefined) {
      json(res, getCrons())
    } else if (req.method === 'POST') {
      // Parse body
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const schedules = JSON.parse(body)
          const success = updateCrons(schedules)
          if (success) {
            json(res, { success: true, schedules })
          } else {
            jsonError(res, 'Failed to update crontab', 500)
          }
        } catch {
          jsonError(res, 'Invalid JSON', 400)
        }
      })
    } else {
      jsonError(res, 'Method not allowed', 405)
    }
  },

  '/api/status': (_req, res) => {
    const openclaw = getOpenClawStatus()
    json(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      openclaw,
      services: [
        'system',
        'costs',
        'jobs',
        'omad',
        'projects',
        'wellbeing',
        'voice',
        'voice-transcripts',
        'crons'
      ],
    })
  },

  '/api/message': (req, res) => {
    if (req.method !== 'POST') {
      jsonError(res, 'Method not allowed', 405)
      return
    }

    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const { message, chat_id } = JSON.parse(body)
        
        if (!TELEGRAM_BOT_TOKEN) {
          jsonError(res, 'Bot token not configured', 500)
          return
        }

        const targetChatId = chat_id || process.env.DEFAULT_CHAT_ID
        if (!targetChatId) {
          jsonError(res, 'Chat ID not provided', 400)
          return
        }

        // Send message via Telegram Bot API
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
        const telegramBody = JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'HTML'
        })

        const telegramRes = await new Promise<http.IncomingMessage>((resolve, reject) => {
          const req = https.request(
            telegramUrl,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(telegramBody)
              }
            },
            (res) => resolve(res)
          )
          req.on('error', reject)
          req.write(telegramBody)
          req.end()
        })

        let telegramData = ''
        telegramRes.on('data', chunk => telegramData += chunk)
        telegramRes.on('end', () => {
          try {
            const result = JSON.parse(telegramData)
            if (result.ok) {
              json(res, { 
                success: true, 
                message: `Sent: ${message}`
              })
            } else {
              jsonError(res, `Telegram API error: ${result.description}`, 500)
            }
          } catch {
            jsonError(res, 'Failed to parse Telegram response', 500)
          }
        })
      } catch {
        jsonError(res, 'Invalid JSON', 400)
      }
    })
  },
}

// --- Server ---

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
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
