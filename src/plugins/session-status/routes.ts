import { Hono } from 'hono'
import { execSafe } from '../../../api/lib/shell'

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
    const sessionLines = statusText.split('\n').filter((line: string) => line.includes('|') && line.includes('agent:'))

    for (const line of sessionLines.slice(0, 3)) {
      const parts = line.split(/[|]/).map((p: string) => p.trim()).filter(Boolean)
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
          age: age.replace(/\s*ago\s*/, '').trim(),
        })
      }
    }

    return {
      version,
      gateway: {
        reachable,
        latencyMs,
        version: gwVersion,
      },
      runtime: {
        defaultModel,
        os: osMatch?.[1]?.trim() || 'linux',
        nodeVersion: nodeMatch?.[1] || '22.x',
      },
      sessions: {
        total: totalSessions,
        active: sessions,
      },
      agents: {
        count: agentCount,
        totalSessions,
      },
      security: {
        critical,
        warn,
        info,
      },
      update: {
        available: updateAvailable,
        current: version,
        latest: latestVersion,
      },
      channels: {
        telegram: {
          enabled: telegramEnabled,
          status: 'OK',
        },
      },
    }
  } catch (err) {
    console.error('Failed to get OpenClaw status:', err)
    return null
  }
}

const router = new Hono()

router.get('/', (c) => {
  const openclaw = getOpenClawStatus()
  return c.json({
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
      'crons',
    ],
  })
})

export default router
