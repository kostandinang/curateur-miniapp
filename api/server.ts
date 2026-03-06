import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { corsMiddleware } from './middleware/cors'
import { authMiddleware } from './middleware/auth'
import { hasBotToken, sendTelegramMessage } from './lib/telegram'
import { WORKSPACE_DIR, fileExists, readJsonFile } from './lib/workspace'

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

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Skill execute endpoint -- sends command to Telegram
app.post('/api/skill/:id/execute', async (c) => {
  const skillId = c.req.param('id')

  if (!hasBotToken()) {
    return c.json({ error: 'Bot token not configured' }, 500)
  }

  const targetChatId = process.env.DEFAULT_CHAT_ID
  if (!targetChatId) {
    return c.json({ error: 'Chat ID not configured' }, 400)
  }

  try {
    const body = await c.req.json<{ inputs?: Record<string, string> }>()

    // Build command from skill ID and optional inputs
    const inputStr = body.inputs
      ? Object.values(body.inputs).filter(Boolean).join(' ')
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
  if (!hasBotToken()) {
    return c.json({ error: 'Bot token not configured' }, 500)
  }

  try {
    const { message, chat_id } = await c.req.json<{ message: string; chat_id?: string }>()
    const targetChatId = chat_id || process.env.DEFAULT_CHAT_ID

    if (!targetChatId) {
      return c.json({ error: 'Chat ID not provided' }, 400)
    }

    const result = await sendTelegramMessage(targetChatId, message)
    if (result.ok) {
      return c.json({ success: true, message: `Sent: ${message}` })
    }
    return c.json({ error: `Telegram API error: ${result.description}` }, 500)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }
})

// MCP config endpoints
app.get('/api/mcp', async (c) => {
  // Read current MCP server configs from openclaw.json
  const configPath = '/root/.openclaw/openclaw.json'
  try {
    if (fileExists(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
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
    const body = await c.req.json<Record<string, unknown>>()
    // For now, return the config as-is (write support can be added later)
    return c.json({ id: serverId, config: body, saved: true })
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
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
