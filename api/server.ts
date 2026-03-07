import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import JSON5 from 'json5'

import { corsMiddleware } from './middleware/cors'
import { authMiddleware } from './middleware/auth'
import { hasBotToken, sendTelegramMessage } from './lib/telegram'
import { WORKSPACE_DIR, fileExists, readJsonFile } from './lib/workspace'
import { sanitizeInput } from './lib/sanitize'
import { loadAllowedSkillIds } from './lib/skill-loader'

const serverDir = path.dirname(new URL(import.meta.url).pathname)
const ALLOWED_SKILL_IDS = loadAllowedSkillIds(path.join(serverDir, '..', 'src', 'plugins'))

const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || '/root/.openclaw/openclaw.json'
const IDENTITY_PATH = process.env.IDENTITY_PATH || '/root/.openclaw/workspace/IDENTITY.md'

// Plugin routes
import systemMonitorRoutes from '../src/plugins/system-monitor/routes'
import omadTrackerRoutes from '../src/plugins/omad-tracker/routes'
import costHeatmapRoutes from '../src/plugins/cost-heatmap/routes'
import jobSearchRoutes from '../src/plugins/job-search/routes'
import wellbeingRoutes from '../src/plugins/wellbeing/routes'
import projectUpdatesRoutes from '../src/plugins/project-updates/routes'
import voiceNotesRoutes from '../src/plugins/voice-notes/routes'
import voiceToTextRoutes from '../src/plugins/voice-to-text/routes'
import cronManagerRoutes from '../src/plugins/cron-manager/routes'
import sessionStatusRoutes from '../src/plugins/session-status/routes'

const PORT = parseInt(process.env.PORT || '3002', 10)

const app = new Hono()

// Global middleware
app.use('*', corsMiddleware)
app.use('*', authMiddleware)

// Mount plugin routes at their manifest prefixes
app.route('/api/system', systemMonitorRoutes)
app.route('/api/omad', omadTrackerRoutes)
app.route('/api/costs', costHeatmapRoutes)
app.route('/api/jobs', jobSearchRoutes)
app.route('/api/wellbeing', wellbeingRoutes)
app.route('/api/projects', projectUpdatesRoutes)
app.route('/api/voice', voiceNotesRoutes)
app.route('/api/voice-transcripts', voiceToTextRoutes)
app.route('/api/crons', cronManagerRoutes)
app.route('/api/status', sessionStatusRoutes)

// --- Shared endpoints ---

// Config endpoints
app.get('/api/config', async (c) => {
  const configPath = path.join(process.cwd(), 'curateur.config.json')
  const config = await readJsonFile(configPath, { namingPack: 0, plugins: { views: [], actions: [], connectors: [] } })
  return c.json(config)
})

app.post('/api/config', async (c) => {
  const configPath = path.join(process.cwd(), 'curateur.config.json')
  const body = await c.req.json()
  const fsPromises = await import('node:fs/promises')
  await fsPromises.writeFile(configPath, JSON.stringify(body, null, 2))
  return c.json({ success: true })
})

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Skill execute endpoint -- sends command to Telegram
app.post('/api/skill/:id/execute', async (c) => {
  const skillId = c.req.param('id')

  if (!ALLOWED_SKILL_IDS.has(skillId)) {
    return c.json({ error: `Unknown skill: ${skillId}` }, 404)
  }

  if (!hasBotToken()) {
    return c.json({ error: 'Bot token not configured' }, 500)
  }

  const targetChatId = process.env.DEFAULT_CHAT_ID
  if (!targetChatId) {
    return c.json({ error: 'Chat ID not configured' }, 400)
  }

  try {
    const body = await c.req.json<{ inputs?: Record<string, string> }>()

    // Build command from skill ID and sanitized inputs
    const inputStr = body.inputs
      ? Object.values(body.inputs).map(sanitizeInput).filter(Boolean).join(' ')
      : ''
    const command = `/${skillId}${inputStr ? ` ${inputStr}` : ''}`

    const result = await sendTelegramMessage(targetChatId, command)
    if (result.ok) {
      return c.json({ success: true, message: `Sent: ${command}` })
    }
    return c.json({ error: `Telegram API error: ${result.description}` }, 500)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }
})

// Legacy message endpoint (backward compat)
app.post('/api/message', async (c) => {
  try {
    const { message, chat_id } = await c.req.json<{ message: string; chat_id?: string | number }>()

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Message is required' }, 400)
    }

    const sanitized = sanitizeInput(message)
    if (!sanitized) {
      return c.json({ error: 'Message is empty after sanitization' }, 400)
    }

    const targetChatId = String(chat_id || process.env.DEFAULT_CHAT_ID || '')
    if (!targetChatId) {
      return c.json({ error: 'Chat ID not provided' }, 400)
    }

    // Use openclaw CLI to dispatch session commands — this triggers the bot's
    // command handler (unlike sendMessage which just shows tappable text)
    const OPENCLAW_BIN = process.env.OPENCLAW_BIN || '/usr/bin/openclaw'
    if (sanitized === '/new' || sanitized === '/reset') {
      try {
        execSync(
          `${OPENCLAW_BIN} message send --channel telegram --target ${targetChatId} --message "${sanitized}"`,
          { encoding: 'utf8', timeout: 15000, env: { ...process.env, HOME: '/root' } },
        )
        const label = sanitized === '/new' ? '🆕 New session started' : '🔄 Session reset'
        return c.json({ success: true, message: `${label}! Check Telegram.` })
      } catch {
        // openclaw CLI may return non-zero even on success; treat as sent
        return c.json({ success: true, message: 'Command sent to Telegram.' })
      }
    }

    // For all other messages, use the Telegram Bot API
    if (!hasBotToken()) {
      return c.json({ error: 'Bot token not configured' }, 500)
    }

    const result = await sendTelegramMessage(targetChatId, sanitized)
    if (result.ok) {
      return c.json({ success: true, message: `Sent: ${sanitized}` })
    }
    return c.json({ error: `Telegram API error: ${result.description}` }, 500)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }
})

// MCP config endpoints
app.get('/api/mcp', async (c) => {
  try {
    if (fileExists(OPENCLAW_CONFIG_PATH)) {
      const raw = readFileSync(OPENCLAW_CONFIG_PATH, 'utf8')
      const config = JSON5.parse(raw)
      const mcpServers = config.mcpServers || {}
      return c.json({ servers: mcpServers })
    }
    return c.json({ servers: {} })
  } catch {
    return c.json({ servers: {} })
  }
})

app.post('/api/mcp/:id/config', async (c) => {
  const serverId = c.req.param('id')
  try {
    const body = await c.req.json<{ enabled: boolean }>()

    if (!fileExists(OPENCLAW_CONFIG_PATH)) {
      return c.json({ error: 'OpenClaw config not found' }, 404)
    }

    const raw = readFileSync(OPENCLAW_CONFIG_PATH, 'utf8')
    const config = JSON5.parse(raw)

    if (!config.mcpServers?.[serverId]) {
      return c.json({ error: `MCP server '${serverId}' not found in config` }, 404)
    }

    // Toggle the disabled flag (OpenClaw uses disabled: true to turn off)
    if (body.enabled) {
      delete config.mcpServers[serverId].disabled
    } else {
      config.mcpServers[serverId].disabled = true
    }

    writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
    return c.json({ id: serverId, enabled: body.enabled, saved: true })
  } catch {
    return c.json({ error: 'Failed to update MCP config' }, 500)
  }
})

// Identity endpoint - reads from IDENTITY.md
app.get('/api/identity', async (c) => {
  try {
    if (!fileExists(IDENTITY_PATH)) {
      return c.json({ error: 'Identity file not found' }, 404)
    }
    const raw = readFileSync(IDENTITY_PATH, 'utf8')
    // Parse markdown into structured data
    const identity: Record<string, string | string[]> = {}
    const devices: string[] = []
    const tags: string[] = []
    let inDevicesSection = false
    let inTagsSection = false
    let lastSection = ''

    for (let i = 0; i < raw.split('\n').length; i++) {
      const line = raw.split('\n')[i]
      const trimmed = line.trim()
      if (!trimmed) {
        inDevicesSection = false
        inTagsSection = false
        lastSection = ''
        continue
      }

      // Check for section headers
      if (trimmed === '## Devices') {
        inDevicesSection = true
        continue
      }
      if (trimmed === '## Tags') {
        inTagsSection = true
        continue
      }
      if (trimmed.startsWith('## ')) {
        inDevicesSection = false
        inTagsSection = false
        lastSection = trimmed.slice(3).trim().toLowerCase()
        continue
      }

      // Handle device entries
      if (inDevicesSection && trimmed.startsWith('- ')) {
        devices.push(trimmed.slice(2).trim())
        continue
      }

      // Handle tag entries  
      if (inTagsSection && trimmed.startsWith('- ')) {
        tags.push(trimmed.slice(2).trim())
        continue
      }

      // Handle section values (Role, Focus, Style, etc.)
      if (lastSection && !trimmed.startsWith('- ') && !trimmed.startsWith('#')) {
        switch (lastSection) {
          case 'role':
            identity.role = trimmed
            break
          case 'focus':
            identity.focus = trimmed
            break
          case 'style':
            identity.style = trimmed
            break
        }
        lastSection = ''
        continue
      }

      // Remove markdown bold syntax **text**
      const cleanLine = trimmed.replace(/\*\*/g, '').trim()

      // Check for key-value pairs at top level (bullet points with key: value)
      if (cleanLine.startsWith('- ')) {
        const content = cleanLine.slice(2).trim()
        if (content.includes(':')) {
          const [key, ...valueParts] = content.split(':')
          const cleanKey = key.trim()
          const value = valueParts.join(':').trim()
          if (cleanKey && value) {
            switch (cleanKey.toLowerCase()) {
              case 'name':
                identity.name = value
                break
              case 'emoji':
                identity.emoji = value
                break
              case 'avatar':
                identity.avatar = value
                break
              case 'vibe':
                identity.vibe = value
                break
            }
          }
        }
      }
    }

    return c.json({
      name: identity.name || 'Anonymous',
      emoji: identity.emoji || '🤖',
      avatar: identity.avatar || identity.emoji || '🤖',
      role: identity.role || '',
      focus: identity.focus || '',
      vibe: identity.vibe || '',
      style: identity.style || '',
      devices: devices,
      tags: tags.length > 0 ? tags : ['AI Native', 'Product Focused'],
      raw: identity
    })
  } catch {
    return c.json({ error: 'Failed to read identity' }, 500)
  }
})

// --- Start server ---

const server = serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`Curateur API server running on port ${PORT}`)

// Graceful shutdown
function shutdown() {
  console.log('\nShutting down...')
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
