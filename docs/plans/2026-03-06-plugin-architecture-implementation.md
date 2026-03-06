# Plugin Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace three duplicated registries with a unified manifest-driven plugin system and migrate the monolithic backend to Hono.

**Architecture:** Three-tier plugin system (View/Action/Connector) where each plugin lives in `src/plugins/<name>/` with a `manifest.json`. A build-time loader generates a typed registry. Backend migrates from raw Node.js http to Hono with auto-mounted plugin routes. Frontend shell components consume the single registry.

**Tech Stack:** React 18, TypeScript, Hono, Vite 5, JSON5, lucide-react

**Design doc:** `docs/plans/2026-03-06-plugin-architecture-design.md`

---

## Phase 1: Foundation (Plugin Schema + Registry + Hono Server)

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Hono, JSON5, and @hono/node-server**

Run: `cd /Users/kostandin/Projects/claws/miniapp && pnpm add hono @hono/node-server json5`

**Step 2: Verify installation**

Run: `pnpm ls hono @hono/node-server json5`
Expected: All three packages listed

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add hono, @hono/node-server, json5 dependencies"
```

---

### Task 2: Create plugin schema types

**Files:**
- Create: `src/plugins/schema.ts`

**Step 1: Write the schema types**

```ts
import type { ComponentType } from 'react'

export interface SkillInput {
  name: string
  label: string
  type: 'text' | 'number' | 'toggle' | 'select'
  placeholder?: string
  required?: boolean
  default?: string | number | boolean
  options?: { label: string; value: string }[]
}

interface PluginBase {
  id: string
  name: string
  icon: string
  color: string
  description: string
  enabled?: boolean
}

export interface ViewPlugin extends PluginBase {
  type: 'view'
  widget: {
    component: string
    defaultEnabled: boolean
    refreshInterval?: number
  }
  api?: {
    routes: string
    prefix: string
  }
}

export interface ActionPlugin extends PluginBase {
  type: 'action'
  skill: {
    agent: string
    command: string
    inputs?: SkillInput[]
    component?: string
  }
  api?: {
    routes: string
    prefix: string
  }
}

export interface ConnectorPlugin extends PluginBase {
  type: 'connector'
  mcp: {
    serverName: string
    configSchema?: Record<string, SkillInput>
    defaultConfig?: Record<string, unknown>
  }
  component?: string
}

export type PluginManifest = ViewPlugin | ActionPlugin | ConnectorPlugin

export interface ResolvedViewPlugin extends Omit<ViewPlugin, 'widget'> {
  type: 'view'
  widget: ViewPlugin['widget'] & {
    resolved: ComponentType
  }
  api?: ViewPlugin['api']
}

export interface ResolvedActionPlugin extends ActionPlugin {
  type: 'action'
}

export interface ResolvedConnectorPlugin extends Omit<ConnectorPlugin, 'component'> {
  type: 'connector'
  resolved?: ComponentType
}

export type ResolvedPlugin = ResolvedViewPlugin | ResolvedActionPlugin | ResolvedConnectorPlugin
```

**Step 2: Commit**

```bash
git add src/plugins/schema.ts
git commit -m "feat: add plugin manifest schema types"
```

---

### Task 3: Create naming packs

**Files:**
- Create: `src/plugins/naming-packs.ts`

**Step 1: Write naming packs module**

```ts
export interface NamingPack {
  id: number
  theme: string
  view: string
  action: string
  connector: string
}

export const NAMING_PACKS: NamingPack[] = [
  { id: 0, theme: 'Default', view: 'Facets', action: 'Hooks', connector: 'Taps' },
  { id: 1, theme: 'Sci-Fi', view: 'Scanners', action: 'Protocols', connector: 'Relays' },
  { id: 2, theme: 'Military', view: 'Recon', action: 'Ops', connector: 'Comms' },
  { id: 3, theme: 'Nautical', view: 'Scopes', action: 'Helms', connector: 'Moorings' },
  { id: 4, theme: 'Cyberpunk', view: 'Feeds', action: 'Jacks', connector: 'Uplinks' },
  { id: 5, theme: 'Arcane', view: 'Runes', action: 'Spells', connector: 'Portals' },
  { id: 6, theme: 'Mechanical', view: 'Gauges', action: 'Levers', connector: 'Gears' },
  { id: 7, theme: 'Biological', view: 'Cortexes', action: 'Reflexes', connector: 'Synapses' },
  { id: 8, theme: 'Musical', view: 'Tracks', action: 'Beats', connector: 'Channels' },
  { id: 9, theme: 'Culinary', view: 'Plates', action: 'Recipes', connector: 'Spices' },
  { id: 10, theme: 'Botanical', view: 'Blooms', action: 'Roots', connector: 'Vines' },
]

export const DEFAULT_PACK = NAMING_PACKS[0]

export function getNamingPack(id: number): NamingPack {
  return NAMING_PACKS.find(p => p.id === id) || DEFAULT_PACK
}
```

**Step 2: Commit**

```bash
git add src/plugins/naming-packs.ts
git commit -m "feat: add naming packs for plugin tier display names"
```

---

### Task 4: Create plugin manifests for all existing views

**Files:**
- Create: `src/plugins/exchange-rate/manifest.json`
- Create: `src/plugins/system-monitor/manifest.json`
- Create: `src/plugins/cron-manager/manifest.json`
- Create: `src/plugins/omad-tracker/manifest.json`
- Create: `src/plugins/cost-heatmap/manifest.json`
- Create: `src/plugins/voice-notes/manifest.json`
- Create: `src/plugins/voice-to-text/manifest.json`
- Create: `src/plugins/job-search/manifest.json`
- Create: `src/plugins/flashcards/manifest.json`
- Create: `src/plugins/wellbeing/manifest.json`
- Create: `src/plugins/project-updates/manifest.json`
- Create: `src/plugins/session-status/manifest.json`

**Step 1: Create all 12 view manifests**

Each manifest follows the same structure. Here are all 12:

`src/plugins/exchange-rate/manifest.json`:
```json
{
  "id": "exchange-rate",
  "name": "Exchange Rates",
  "type": "view",
  "icon": "TrendingUp",
  "color": "#667eea",
  "description": "USD/ALL currency tracker",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true,
    "refreshInterval": 600
  }
}
```
Note: No `api` block because ExchangeRate fetches directly from external API.

`src/plugins/system-monitor/manifest.json`:
```json
{
  "id": "system-monitor",
  "name": "System Monitor",
  "type": "view",
  "icon": "Activity",
  "color": "#06b6d4",
  "description": "CPU, RAM, Disk, Network stats",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true,
    "refreshInterval": 30
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/system"
  }
}
```

`src/plugins/cron-manager/manifest.json`:
```json
{
  "id": "cron-manager",
  "name": "Scheduler",
  "type": "view",
  "icon": "Clock",
  "color": "#f59e0b",
  "description": "Manage agent cron schedules",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/crons"
  }
}
```

`src/plugins/omad-tracker/manifest.json`:
```json
{
  "id": "omad-tracker",
  "name": "OMAD Tracker",
  "type": "view",
  "icon": "Flame",
  "color": "#f97316",
  "description": "Fasting streak tracker",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true,
    "refreshInterval": 300
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/omad"
  }
}
```

`src/plugins/cost-heatmap/manifest.json`:
```json
{
  "id": "cost-heatmap",
  "name": "Cost Heatmap",
  "type": "view",
  "icon": "DollarSign",
  "color": "#16a34a",
  "description": "LLM usage analytics",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true,
    "refreshInterval": 600
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/costs"
  }
}
```

`src/plugins/voice-notes/manifest.json`:
```json
{
  "id": "voice-notes",
  "name": "Voice Notes",
  "type": "view",
  "icon": "Mic",
  "color": "#8b5cf6",
  "description": "Voice recordings & transcripts",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/voice"
  }
}
```

`src/plugins/voice-to-text/manifest.json`:
```json
{
  "id": "voice-to-text",
  "name": "Voice to Text",
  "type": "view",
  "icon": "FileText",
  "color": "#ec4899",
  "description": "Transcribe voice messages",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/voice-transcripts"
  }
}
```

`src/plugins/job-search/manifest.json`:
```json
{
  "id": "job-search",
  "name": "Job Search",
  "type": "view",
  "icon": "Briefcase",
  "color": "#0ea5e9",
  "description": "Full stack job positions",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/jobs"
  }
}
```

`src/plugins/flashcards/manifest.json`:
```json
{
  "id": "flashcards",
  "name": "Learn German",
  "type": "view",
  "icon": "BookOpen",
  "color": "#ec4899",
  "description": "A2/B1 vocabulary flashcards",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  }
}
```

`src/plugins/wellbeing/manifest.json`:
```json
{
  "id": "wellbeing",
  "name": "Mood Tracker",
  "type": "view",
  "icon": "Heart",
  "color": "#f43f5e",
  "description": "Daily wellbeing check-ins",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/wellbeing"
  }
}
```

`src/plugins/project-updates/manifest.json`:
```json
{
  "id": "project-updates",
  "name": "Project Updates",
  "type": "view",
  "icon": "FolderKanban",
  "color": "#f97316",
  "description": "Daily standup notes",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/projects"
  }
}
```

`src/plugins/session-status/manifest.json`:
```json
{
  "id": "session-status",
  "name": "OpenClaw Status",
  "type": "view",
  "icon": "Server",
  "color": "#22c55e",
  "description": "OpenClaw infrastructure status",
  "widget": {
    "component": "./widget.tsx",
    "defaultEnabled": true
  },
  "api": {
    "routes": "./routes.ts",
    "prefix": "/api/status"
  }
}
```

**Step 2: Commit**

```bash
git add src/plugins/*/manifest.json
git commit -m "feat: add manifests for all 12 view plugins"
```

---

### Task 5: Create plugin manifests for actions

**Files:**
- Create: `src/plugins/loom-transcript/manifest.json`
- Create: `src/plugins/search-memory/manifest.json`
- Create: `src/plugins/system-status/manifest.json`
- Create: `src/plugins/new-session/manifest.json`
- Create: `src/plugins/reset-session/manifest.json`

**Step 1: Create all 5 action manifests**

`src/plugins/loom-transcript/manifest.json`:
```json
{
  "id": "loom-transcript",
  "name": "Loom Transcript",
  "type": "action",
  "icon": "Video",
  "color": "#6366f1",
  "description": "Get video summaries from Loom URLs",
  "skill": {
    "agent": "loom-transcript.sh",
    "command": "summarize loom",
    "inputs": [
      {
        "name": "url",
        "label": "Loom URL",
        "type": "text",
        "placeholder": "https://loom.com/share/...",
        "required": true
      }
    ]
  }
}
```

`src/plugins/search-memory/manifest.json`:
```json
{
  "id": "search-memory",
  "name": "Search Memory",
  "type": "action",
  "icon": "Search",
  "color": "#8b5cf6",
  "description": "Find past notes and conversations",
  "skill": {
    "agent": "search-memory.sh",
    "command": "search memory",
    "inputs": [
      {
        "name": "query",
        "label": "Search",
        "type": "text",
        "placeholder": "What are you looking for?",
        "required": true
      }
    ]
  }
}
```

`src/plugins/system-status/manifest.json`:
```json
{
  "id": "system-status",
  "name": "System Status",
  "type": "action",
  "icon": "Activity",
  "color": "#22c55e",
  "description": "Check OpenClaw health and connection",
  "skill": {
    "agent": "system-status.sh",
    "command": "/status",
    "inputs": []
  }
}
```

`src/plugins/new-session/manifest.json`:
```json
{
  "id": "new-session",
  "name": "New Session",
  "type": "action",
  "icon": "Plus",
  "color": "#0ea5e9",
  "description": "Start fresh with cleared context",
  "skill": {
    "agent": "new-session.sh",
    "command": "/new",
    "inputs": []
  }
}
```

`src/plugins/reset-session/manifest.json`:
```json
{
  "id": "reset-session",
  "name": "Reset Session",
  "type": "action",
  "icon": "RotateCcw",
  "color": "#f59e0b",
  "description": "Clear all context and restart",
  "skill": {
    "agent": "reset-session.sh",
    "command": "/reset",
    "inputs": []
  }
}
```

**Step 2: Commit**

```bash
git add src/plugins/*/manifest.json
git commit -m "feat: add manifests for all 5 action plugins"
```

---

### Task 6: Create plugin manifests for connectors

**Files:**
- Create: `src/plugins/mcp-filesystem/manifest.json`
- Create: `src/plugins/mcp-github/manifest.json`
- Create: `src/plugins/mcp-git/manifest.json`
- Create: `src/plugins/mcp-postgres/manifest.json`
- Create: `src/plugins/mcp-fetch/manifest.json`
- Create: `src/plugins/mcp-slack/manifest.json`
- Create: `src/plugins/mcp-brave-search/manifest.json`
- Create: `src/plugins/mcp-puppeteer/manifest.json`

**Step 1: Create all 8 connector manifests**

`src/plugins/mcp-filesystem/manifest.json`:
```json
{
  "id": "mcp-filesystem",
  "name": "File System",
  "type": "connector",
  "icon": "FolderOpen",
  "color": "#f59e0b",
  "description": "Read and write files on your system",
  "mcp": {
    "serverName": "filesystem",
    "configSchema": {
      "rootPath": {
        "name": "rootPath",
        "label": "Root Path",
        "type": "text",
        "required": true,
        "default": "/root/.openclaw/workspace"
      }
    }
  }
}
```

`src/plugins/mcp-github/manifest.json`:
```json
{
  "id": "mcp-github",
  "name": "GitHub",
  "type": "connector",
  "icon": "Terminal",
  "color": "#6366f1",
  "description": "Repository management, issues, PRs, code search",
  "mcp": {
    "serverName": "github",
    "configSchema": {
      "token": {
        "name": "token",
        "label": "GitHub Token",
        "type": "text",
        "required": true
      }
    }
  }
}
```

`src/plugins/mcp-git/manifest.json`:
```json
{
  "id": "mcp-git",
  "name": "Git",
  "type": "connector",
  "icon": "Terminal",
  "color": "#6366f1",
  "description": "Read git history and manage branches",
  "mcp": {
    "serverName": "git"
  }
}
```

`src/plugins/mcp-postgres/manifest.json`:
```json
{
  "id": "mcp-postgres",
  "name": "PostgreSQL",
  "type": "connector",
  "icon": "Database",
  "color": "#10b981",
  "description": "Read and write PostgreSQL databases",
  "mcp": {
    "serverName": "postgres",
    "configSchema": {
      "connectionString": {
        "name": "connectionString",
        "label": "Connection String",
        "type": "text",
        "required": true,
        "placeholder": "postgresql://user:pass@host:5432/db"
      }
    }
  }
}
```

`src/plugins/mcp-fetch/manifest.json`:
```json
{
  "id": "mcp-fetch",
  "name": "Fetch",
  "type": "connector",
  "icon": "Globe",
  "color": "#0ea5e9",
  "description": "Make HTTP requests to any URL",
  "mcp": {
    "serverName": "fetch"
  }
}
```

`src/plugins/mcp-slack/manifest.json`:
```json
{
  "id": "mcp-slack",
  "name": "Slack",
  "type": "connector",
  "icon": "MessageSquare",
  "color": "#ec4899",
  "description": "Post messages and manage channels",
  "mcp": {
    "serverName": "slack",
    "configSchema": {
      "token": {
        "name": "token",
        "label": "Slack Bot Token",
        "type": "text",
        "required": true
      }
    }
  }
}
```

`src/plugins/mcp-brave-search/manifest.json`:
```json
{
  "id": "mcp-brave-search",
  "name": "Brave Search",
  "type": "connector",
  "icon": "Search",
  "color": "#f97316",
  "description": "Web search using Brave Search API",
  "mcp": {
    "serverName": "brave-search",
    "configSchema": {
      "apiKey": {
        "name": "apiKey",
        "label": "API Key",
        "type": "text",
        "required": true
      }
    }
  }
}
```

`src/plugins/mcp-puppeteer/manifest.json`:
```json
{
  "id": "mcp-puppeteer",
  "name": "Puppeteer",
  "type": "connector",
  "icon": "Globe",
  "color": "#0ea5e9",
  "description": "Browser automation and web scraping",
  "mcp": {
    "serverName": "puppeteer"
  }
}
```

**Step 2: Commit**

```bash
git add src/plugins/*/manifest.json
git commit -m "feat: add manifests for all 8 connector plugins"
```

---

### Task 7: Create the plugin registry loader

**Files:**
- Create: `src/plugins/registry.ts`

**Step 1: Write the registry that imports all manifests and exports typed plugin lists**

```ts
import type { PluginManifest, ViewPlugin, ActionPlugin, ConnectorPlugin } from './schema'

// Import all manifests statically (Vite resolves JSON imports at build time)
import exchangeRate from './exchange-rate/manifest.json'
import systemMonitor from './system-monitor/manifest.json'
import cronManager from './cron-manager/manifest.json'
import omadTracker from './omad-tracker/manifest.json'
import costHeatmap from './cost-heatmap/manifest.json'
import voiceNotes from './voice-notes/manifest.json'
import voiceToText from './voice-to-text/manifest.json'
import jobSearch from './job-search/manifest.json'
import flashcards from './flashcards/manifest.json'
import wellbeing from './wellbeing/manifest.json'
import projectUpdates from './project-updates/manifest.json'
import sessionStatus from './session-status/manifest.json'

import loomTranscript from './loom-transcript/manifest.json'
import searchMemory from './search-memory/manifest.json'
import systemStatus from './system-status/manifest.json'
import newSession from './new-session/manifest.json'
import resetSession from './reset-session/manifest.json'

import mcpFilesystem from './mcp-filesystem/manifest.json'
import mcpGithub from './mcp-github/manifest.json'
import mcpGit from './mcp-git/manifest.json'
import mcpPostgres from './mcp-postgres/manifest.json'
import mcpFetch from './mcp-fetch/manifest.json'
import mcpSlack from './mcp-slack/manifest.json'
import mcpBraveSearch from './mcp-brave-search/manifest.json'
import mcpPuppeteer from './mcp-puppeteer/manifest.json'

export const plugins: PluginManifest[] = [
  // Views
  exchangeRate,
  systemMonitor,
  cronManager,
  omadTracker,
  costHeatmap,
  voiceNotes,
  voiceToText,
  jobSearch,
  flashcards,
  wellbeing,
  projectUpdates,
  sessionStatus,
  // Actions
  loomTranscript,
  searchMemory,
  systemStatus,
  newSession,
  resetSession,
  // Connectors
  mcpFilesystem,
  mcpGithub,
  mcpGit,
  mcpPostgres,
  mcpFetch,
  mcpSlack,
  mcpBraveSearch,
  mcpPuppeteer,
] as PluginManifest[]

export const views = plugins.filter((p): p is ViewPlugin => p.type === 'view')
export const actions = plugins.filter((p): p is ActionPlugin => p.type === 'action')
export const connectors = plugins.filter((p): p is ConnectorPlugin => p.type === 'connector')

export function getPlugin(id: string): PluginManifest | undefined {
  return plugins.find(p => p.id === id)
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/kostandin/Projects/claws/miniapp && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No errors (or only pre-existing ones unrelated to plugins)

**Step 3: Commit**

```bash
git add src/plugins/registry.ts
git commit -m "feat: add plugin registry with static manifest imports"
```

---

## Phase 2: Backend Migration (Hono)

### Task 8: Create backend shared utilities

**Files:**
- Create: `api/lib/workspace.ts`
- Create: `api/lib/telegram.ts`
- Create: `api/lib/shell.ts`

**Step 1: Write workspace utilities**

`api/lib/workspace.ts`:
```ts
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

export const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/root/.openclaw/workspace'

export function workspacePath(...segments: string[]): string {
  return path.join(WORKSPACE_DIR, ...segments)
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

export function readJsonFileSync<T>(filePath: string, fallback: T): T {
  try {
    const content = readFileSync(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}

export function readFileContent(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

export function listDir(dirPath: string): string[] {
  try {
    if (!existsSync(dirPath)) return []
    return readdirSync(dirPath)
  } catch {
    return []
  }
}

export function getFileStat(filePath: string) {
  try {
    return statSync(filePath)
  } catch {
    return null
  }
}
```

**Step 2: Write telegram utilities**

`api/lib/telegram.ts`:
```ts
import https from 'node:https'
import { readFileSync } from 'node:fs'

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

export async function sendTelegramMessage(
  chatId: string | number,
  text: string
): Promise<{ ok: boolean; description?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Bot token not configured')
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  })

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error('Failed to parse Telegram response'))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

export function hasBotToken(): boolean {
  return TELEGRAM_BOT_TOKEN.length > 0
}
```

**Step 3: Write shell utilities**

`api/lib/shell.ts`:
```ts
import { execSync } from 'node:child_process'

export function execSafe(cmd: string, timeoutMs = 5000): string {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: timeoutMs }).trim()
  } catch {
    return ''
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}
```

**Step 4: Commit**

```bash
git add api/lib/workspace.ts api/lib/telegram.ts api/lib/shell.ts
git commit -m "feat: add shared backend utilities (workspace, telegram, shell)"
```

---

### Task 9: Create backend middleware

**Files:**
- Create: `api/middleware/cors.ts`
- Create: `api/middleware/auth.ts`

**Step 1: Write CORS middleware**

`api/middleware/cors.ts`:
```ts
import { cors } from 'hono/cors'

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*'

export const corsMiddleware = cors({
  origin: ALLOWED_ORIGIN,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
})
```

**Step 2: Write auth middleware (pass-through for now, same as current behavior)**

`api/middleware/auth.ts`:
```ts
import type { MiddlewareHandler } from 'hono'

export const authMiddleware: MiddlewareHandler = async (_c, next) => {
  // Currently auth is handled on the frontend via Telegram WebApp context
  // or URL secret key. Backend is trusted (same-origin or CORS).
  // This middleware is a placeholder for future backend auth.
  await next()
}
```

**Step 3: Commit**

```bash
git add api/middleware/cors.ts api/middleware/auth.ts
git commit -m "feat: add Hono middleware (cors, auth placeholder)"
```

---

### Task 10: Migrate plugin routes — System Monitor

**Files:**
- Create: `src/plugins/system-monitor/routes.ts`

**Step 1: Extract system stats route from api-server.ts**

```ts
import { Hono } from 'hono'
import { execSafe, formatBytes } from '../../api/lib/shell'

const IFACE_PATTERN = /^[a-zA-Z0-9_-]+$/

const router = new Hono()

router.get('/', (c) => {
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
      rxBytes = parseInt(execSafe(`cat /sys/class/net/${iface}/statistics/rx_bytes 2>/dev/null`), 10) || 0
      txBytes = parseInt(execSafe(`cat /sys/class/net/${iface}/statistics/tx_bytes 2>/dev/null`), 10) || 0
    }

    const uptimeSec = parseFloat(execSafe("cat /proc/uptime | awk '{print $1}'")) || 0
    const uptimeDays = Math.floor(uptimeSec / 86400)
    const uptimeHours = Math.floor((uptimeSec % 86400) / 3600)
    const uptimeMins = Math.floor(((uptimeSec % 86400) % 3600) / 60)

    const load = execSafe("uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ','") || '0.00'
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

    return c.json({
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
    })
  } catch {
    return c.json({ error: 'Failed to collect system stats' }, 500)
  }
})

export default router
```

**Step 2: Commit**

```bash
git add src/plugins/system-monitor/routes.ts
git commit -m "feat: extract system-monitor routes to plugin"
```

---

### Task 11: Migrate plugin routes — OMAD, Costs, Jobs, Wellbeing, Projects, Voice, Crons, Status

**Files:**
- Create: `src/plugins/omad-tracker/routes.ts`
- Create: `src/plugins/cost-heatmap/routes.ts`
- Create: `src/plugins/job-search/routes.ts`
- Create: `src/plugins/wellbeing/routes.ts`
- Create: `src/plugins/project-updates/routes.ts`
- Create: `src/plugins/voice-notes/routes.ts`
- Create: `src/plugins/voice-to-text/routes.ts`
- Create: `src/plugins/cron-manager/routes.ts`
- Create: `src/plugins/session-status/routes.ts`

**Step 1: Create OMAD routes**

`src/plugins/omad-tracker/routes.ts`:
```ts
import { Hono } from 'hono'
import { readFileSync, existsSync } from 'node:fs'
import { workspacePath } from '../../api/lib/workspace'

interface OMADEntry {
  date: string
  time: string
  note: string
  success: boolean
  lineNum?: number
}

const router = new Hono()

router.get('/', (c) => {
  try {
    const memoryPath = workspacePath('MEMORY.md')
    if (!existsSync(memoryPath)) {
      return c.json({ streak: 0, totalEntries: 0, history: [], lastEntry: null, entries: [] })
    }

    const content = readFileSync(memoryPath, 'utf8')
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
          success: !lower.includes('broke') && !lower.includes('missed') && !lower.includes('failed'),
        })
      }
    }

    const sorted = entries.sort((a, b) => {
      const timeDiff = new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
      if (timeDiff !== 0) return timeDiff
      return (b.lineNum || 0) - (a.lineNum || 0)
    })

    const latestPerDate = new Map<string, OMADEntry>()
    for (const entry of entries) {
      const existing = latestPerDate.get(entry.date)
      if (!existing) {
        latestPerDate.set(entry.date, entry)
      } else {
        const entryTime = new Date(`${entry.date}T${entry.time}`).getTime()
        const existingTime = new Date(`${existing.date}T${existing.time}`).getTime()
        if (entryTime > existingTime) {
          latestPerDate.set(entry.date, entry)
        }
      }
    }
    const uniqueEntries = Array.from(latestPerDate.values()).sort(
      (a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime(),
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

    return c.json({
      streak,
      totalEntries: entries.length,
      history,
      lastEntry: sorted[0] || null,
      entries: sorted.slice(0, 10),
    })
  } catch {
    return c.json({ streak: 0, totalEntries: 0, history: [], lastEntry: null, entries: [] })
  }
})

export default router
```

**Step 2: Create remaining routes files**

Each route file follows the same pattern — extract the handler logic from `api-server.ts` into a Hono router. The routes to create:

`src/plugins/cost-heatmap/routes.ts` — extract `getCosts()` and `generateCostsFromSessions()`
`src/plugins/job-search/routes.ts` — extract `getJobs()` and `getDefaultJobs()`
`src/plugins/wellbeing/routes.ts` — extract `getWellbeingData()`
`src/plugins/project-updates/routes.ts` — extract `getProjectUpdates()`
`src/plugins/voice-notes/routes.ts` — extract `getVoiceNotes()` + `getVoiceStats()` (mount at `/api/voice`, add sub-route `/stats`)
`src/plugins/voice-to-text/routes.ts` — extract `getVoiceTranscripts()`
`src/plugins/cron-manager/routes.ts` — extract `getCrons()` + `updateCrons()` (GET + POST)
`src/plugins/session-status/routes.ts` — extract `getOpenClawStatus()`

Each follows this template:
```ts
import { Hono } from 'hono'
import { /* needed helpers */ } from '../../api/lib/workspace'

const router = new Hono()

router.get('/', (c) => {
  // Extracted logic from api-server.ts
  return c.json(result)
})

export default router
```

For `cron-manager/routes.ts`, include both GET and POST:
```ts
router.get('/', (c) => { /* getCrons() */ })
router.post('/', async (c) => { /* updateCrons() from request body */ })
```

For `voice-notes/routes.ts`, include the stats sub-route:
```ts
router.get('/', (c) => { /* getVoiceNotes() */ })
router.get('/stats', (c) => { /* getVoiceStats() */ })
```

**Step 3: Commit**

```bash
git add src/plugins/*/routes.ts
git commit -m "feat: extract all plugin routes from monolithic api-server"
```

---

### Task 12: Create Hono server entry point

**Files:**
- Create: `api/server.ts`

**Step 1: Write the Hono server with plugin route auto-mounting**

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors'
import { authMiddleware } from './middleware/auth'
import { sendTelegramMessage, hasBotToken } from './lib/telegram'

// Import plugin registries (manifest data only, no React)
import exchangeRate from '../src/plugins/exchange-rate/manifest.json'
import systemMonitor from '../src/plugins/system-monitor/manifest.json'
import cronManager from '../src/plugins/cron-manager/manifest.json'
import omadTracker from '../src/plugins/omad-tracker/manifest.json'
import costHeatmap from '../src/plugins/cost-heatmap/manifest.json'
import voiceNotes from '../src/plugins/voice-notes/manifest.json'
import voiceToText from '../src/plugins/voice-to-text/manifest.json'
import jobSearch from '../src/plugins/job-search/manifest.json'
import wellbeing from '../src/plugins/wellbeing/manifest.json'
import projectUpdates from '../src/plugins/project-updates/manifest.json'
import sessionStatus from '../src/plugins/session-status/manifest.json'

// Import plugin routes
import systemMonitorRoutes from '../src/plugins/system-monitor/routes'
import cronManagerRoutes from '../src/plugins/cron-manager/routes'
import omadTrackerRoutes from '../src/plugins/omad-tracker/routes'
import costHeatmapRoutes from '../src/plugins/cost-heatmap/routes'
import voiceNotesRoutes from '../src/plugins/voice-notes/routes'
import voiceToTextRoutes from '../src/plugins/voice-to-text/routes'
import jobSearchRoutes from '../src/plugins/job-search/routes'
import wellbeingRoutes from '../src/plugins/wellbeing/routes'
import projectUpdatesRoutes from '../src/plugins/project-updates/routes'
import sessionStatusRoutes from '../src/plugins/session-status/routes'

const app = new Hono()

// Global middleware
app.use('*', corsMiddleware)
app.use('/api/*', authMiddleware)

// Mount plugin routes
const pluginRoutes: Array<{ prefix: string; router: Hono }> = [
  { prefix: systemMonitor.api.prefix, router: systemMonitorRoutes },
  { prefix: cronManager.api.prefix, router: cronManagerRoutes },
  { prefix: omadTracker.api.prefix, router: omadTrackerRoutes },
  { prefix: costHeatmap.api.prefix, router: costHeatmapRoutes },
  { prefix: voiceNotes.api.prefix, router: voiceNotesRoutes },
  { prefix: voiceToText.api.prefix, router: voiceToTextRoutes },
  { prefix: jobSearch.api.prefix, router: jobSearchRoutes },
  { prefix: wellbeing.api.prefix, router: wellbeingRoutes },
  { prefix: projectUpdates.api.prefix, router: projectUpdatesRoutes },
  { prefix: sessionStatus.api.prefix, router: sessionStatusRoutes },
]

for (const { prefix, router } of pluginRoutes) {
  app.route(prefix, router)
}

// Shared: skill execution (sends command to Telegram)
app.post('/api/skill/:id/execute', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<{ inputs?: Record<string, string>; chat_id?: string | number }>()

  if (!hasBotToken()) {
    return c.json({ success: false, error: 'Bot token not configured' }, 500)
  }

  const chatId = body.chat_id || process.env.DEFAULT_CHAT_ID
  if (!chatId) {
    return c.json({ success: false, error: 'Chat ID not provided' }, 400)
  }

  // Build command from plugin manifest
  // The frontend sends the pre-built command string
  const command = body.inputs?._command || `/${id}`

  try {
    const result = await sendTelegramMessage(chatId, command)
    if (result.ok) {
      return c.json({ success: true, message: `Sent: ${command}` })
    }
    return c.json({ success: false, error: `Telegram API error: ${result.description}` }, 500)
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500)
  }
})

// Legacy /api/message endpoint (backward compat during migration)
app.post('/api/message', async (c) => {
  const { message, chat_id } = await c.req.json<{ message: string; chat_id?: string | number }>()

  if (!hasBotToken()) {
    return c.json({ success: false, error: 'Bot token not configured' }, 500)
  }

  const targetChatId = chat_id || process.env.DEFAULT_CHAT_ID
  if (!targetChatId) {
    return c.json({ success: false, error: 'Chat ID not provided' }, 400)
  }

  try {
    const result = await sendTelegramMessage(targetChatId, message)
    if (result.ok) {
      return c.json({ success: true, message: `Sent: ${message}` })
    }
    return c.json({ success: false, error: `Telegram API error: ${result.description}` }, 500)
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500)
  }
})

// MCP config management
app.get('/api/mcp', async (c) => {
  // Read OpenClaw config and return MCP server status
  const JSON5 = await import('json5')
  const { readFileContent } = await import('./lib/workspace')
  const configPath = process.env.OPENCLAW_CONFIG_PATH || `${process.env.HOME}/.openclaw/openclaw.json`
  const raw = readFileContent(configPath)
  if (!raw) return c.json({ servers: {} })
  try {
    const config = JSON5.parse(raw)
    return c.json({ servers: config.mcp_servers || config.mcpServers || {} })
  } catch {
    return c.json({ servers: {} })
  }
})

app.post('/api/mcp/:id/config', async (c) => {
  const JSON5 = await import('json5')
  const fs = await import('node:fs/promises')
  const { readFileContent } = await import('./lib/workspace')

  const { id } = c.req.param()
  const body = await c.req.json<{ enabled: boolean; config?: Record<string, unknown> }>()
  const configPath = process.env.OPENCLAW_CONFIG_PATH || `${process.env.HOME}/.openclaw/openclaw.json`

  const raw = readFileContent(configPath)
  if (!raw) return c.json({ error: 'OpenClaw config not found' }, 404)

  try {
    const config = JSON5.parse(raw)
    const serversKey = config.mcp_servers ? 'mcp_servers' : 'mcpServers'
    if (!config[serversKey]) config[serversKey] = {}

    if (body.enabled) {
      config[serversKey][id] = body.config || {}
    } else {
      delete config[serversKey][id]
    }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2))
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Start server
const PORT = parseInt(process.env.PORT || '3002', 10)

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Curateur API server running on port ${info.port}`)
})

// Graceful shutdown
function shutdown() {
  console.log('\nShutting down...')
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

**Step 2: Update tsconfig.server.json to include new files**

Replace `"include": ["api-server.ts"]` with:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist-server",
    "noEmit": true,
    "types": ["node"],
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["api/**/*.ts", "src/plugins/*/routes.ts", "src/plugins/schema.ts"]
}
```

**Step 3: Update package.json scripts**

Change `"server"` from `"tsx api-server.ts"` to `"tsx api/server.ts"`.
Also update `"lint"` and related scripts to include `api/`.

**Step 4: Verify server starts**

Run: `cd /Users/kostandin/Projects/claws/miniapp && npx tsx api/server.ts &`
Run: `curl http://localhost:3002/api/health`
Expected: `{"status":"ok","timestamp":"..."}`
Then kill the background process.

**Step 5: Commit**

```bash
git add api/server.ts tsconfig.server.json package.json
git commit -m "feat: create Hono server entry point with auto-mounted plugin routes"
```

---

## Phase 3: Frontend Migration

### Task 13: Move widget components to plugin directories

**Files:**
- Move: `src/components/ExchangeRate.tsx` → `src/plugins/exchange-rate/widget.tsx`
- Move: `src/components/SystemMonitor.tsx` → `src/plugins/system-monitor/widget.tsx`
- Move: `src/components/CronManager.tsx` → `src/plugins/cron-manager/widget.tsx`
- Move: `src/components/OMADTracker.tsx` → `src/plugins/omad-tracker/widget.tsx`
- Move: `src/components/CostHeatmap.tsx` → `src/plugins/cost-heatmap/widget.tsx`
- Move: `src/components/VoiceNotes.tsx` → `src/plugins/voice-notes/widget.tsx`
- Move: `src/components/VoiceToText.tsx` → `src/plugins/voice-to-text/widget.tsx`
- Move: `src/components/JobSearch.tsx` → `src/plugins/job-search/widget.tsx`
- Move: `src/components/Flashcards.tsx` → `src/plugins/flashcards/widget.tsx`
- Move: `src/components/Wellbeing.tsx` → `src/plugins/wellbeing/widget.tsx`
- Move: `src/components/ProjectUpdates.tsx` → `src/plugins/project-updates/widget.tsx`
- Move: `src/components/SessionStatus.tsx` → `src/plugins/session-status/widget.tsx`

**Step 1: Move all 12 component files**

```bash
cd /Users/kostandin/Projects/claws/miniapp
mv src/components/ExchangeRate.tsx src/plugins/exchange-rate/widget.tsx
mv src/components/SystemMonitor.tsx src/plugins/system-monitor/widget.tsx
mv src/components/CronManager.tsx src/plugins/cron-manager/widget.tsx
mv src/components/OMADTracker.tsx src/plugins/omad-tracker/widget.tsx
mv src/components/CostHeatmap.tsx src/plugins/cost-heatmap/widget.tsx
mv src/components/VoiceNotes.tsx src/plugins/voice-notes/widget.tsx
mv src/components/VoiceToText.tsx src/plugins/voice-to-text/widget.tsx
mv src/components/JobSearch.tsx src/plugins/job-search/widget.tsx
mv src/components/Flashcards.tsx src/plugins/flashcards/widget.tsx
mv src/components/Wellbeing.tsx src/plugins/wellbeing/widget.tsx
mv src/components/ProjectUpdates.tsx src/plugins/project-updates/widget.tsx
mv src/components/SessionStatus.tsx src/plugins/session-status/widget.tsx
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: move widget components to plugin directories"
```

---

### Task 14: Create frontend hooks

**Files:**
- Create: `src/hooks/usePlugin.ts`
- Create: `src/hooks/useSettings.ts`
- Create: `src/hooks/useNamingPack.ts`

**Step 1: Write usePlugin hook**

`src/hooks/usePlugin.ts`:
```ts
import { useCallback } from 'react'
import { getPlugin } from '../plugins/registry'
import type { PluginManifest } from '../plugins/schema'

export function usePlugin(pluginId: string) {
  const plugin = getPlugin(pluginId)

  const pluginFetch = useCallback(
    (path = '', init?: RequestInit) => {
      if (!plugin || plugin.type !== 'view' || !plugin.api?.prefix) {
        throw new Error(`Plugin ${pluginId} has no API prefix`)
      }
      return fetch(`${plugin.api.prefix}${path}`, init)
    },
    [plugin, pluginId]
  )

  return {
    manifest: plugin as PluginManifest,
    fetch: pluginFetch,
  }
}
```

**Step 2: Write useSettings hook**

`src/hooks/useSettings.ts`:
```ts
import { useCallback, useEffect, useState } from 'react'
import { views } from '../plugins/registry'

const STORAGE_KEY = 'curateur-widgets-enabled'

export function useSettings() {
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setEnabledPlugins(JSON.parse(saved))
      } else {
        setEnabledPlugins(views.filter(v => v.widget.defaultEnabled).map(v => v.id))
      }
    } catch {
      setEnabledPlugins(views.filter(v => v.widget.defaultEnabled).map(v => v.id))
    }
    setLoaded(true)
  }, [])

  const toggle = useCallback((id: string) => {
    setEnabledPlugins(prev => {
      const next = prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const defaults = views.filter(v => v.widget.defaultEnabled).map(v => v.id)
    setEnabledPlugins(defaults)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
  }, [])

  const isEnabled = useCallback((id: string) => enabledPlugins.includes(id), [enabledPlugins])

  return { enabledPlugins, loaded, toggle, reset, isEnabled }
}
```

**Step 3: Write useNamingPack hook**

`src/hooks/useNamingPack.ts`:
```ts
import { useState } from 'react'
import { getNamingPack, type NamingPack } from '../plugins/naming-packs'

const STORAGE_KEY = 'curateur-naming-pack'

export function useNamingPack(): NamingPack {
  const [pack] = useState<NamingPack>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return getNamingPack(parseInt(saved, 10))
    } catch {}
    return getNamingPack(0)
  })

  return pack
}
```

**Step 4: Commit**

```bash
git add src/hooks/usePlugin.ts src/hooks/useSettings.ts src/hooks/useNamingPack.ts
git commit -m "feat: add frontend hooks (usePlugin, useSettings, useNamingPack)"
```

---

### Task 15: Create shell components — FacetSelector

**Files:**
- Create: `src/shell/FacetSelector.tsx`

**Step 1: Write FacetSelector (replaces Widgets.tsx)**

This component reads the registry, filters by enabled views, renders the horizontal scroller, and lazy-loads the active widget.

```tsx
import { type ComponentType, Suspense, lazy, useMemo, useState } from 'react'
import { Settings } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { views } from '../plugins/registry'
import { useSettings } from '../hooks/useSettings'
import type { ViewPlugin } from '../plugins/schema'
import PluginSettings from './Settings'

const widgetCache = new Map<string, ComponentType>()

function getWidgetComponent(plugin: ViewPlugin): ComponentType {
  if (!widgetCache.has(plugin.id)) {
    const component = lazy(() => import(`../plugins/${plugin.id}/widget.tsx`))
    widgetCache.set(plugin.id, component)
  }
  return widgetCache.get(plugin.id)!
}

function getIcon(iconName: string) {
  return (LucideIcons as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

interface FacetSelectorProps {
  activeWidget: string
  setActiveWidget: (id: string) => void
}

export default function FacetSelector({ activeWidget, setActiveWidget }: FacetSelectorProps) {
  const { enabledPlugins, loaded, toggle, reset, isEnabled } = useSettings()
  const [showSettings, setShowSettings] = useState(false)

  const visibleViews = useMemo(
    () => views.filter(v => enabledPlugins.includes(v.id)),
    [enabledPlugins]
  )

  if (!loaded) {
    return <div className="empty"><div className="spinner">Loading...</div></div>
  }

  if (showSettings) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowSettings(false)}
          style={{
            padding: '10px 16px', border: 'none', borderRadius: '10px',
            background: 'var(--c-secondary-bg)', color: 'var(--c-text)',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px',
          }}
        >
          ← Back
        </button>
        <PluginSettings
          views={views}
          isEnabled={isEnabled}
          onToggle={toggle}
          onReset={reset}
        />
      </>
    )
  }

  const activeView = views.find(v => v.id === activeWidget)
  const ActiveComponent = activeView ? getWidgetComponent(activeView) : null

  return (
    <>
      <div
        style={{
          marginBottom: '16px', marginLeft: '-16px', marginRight: '-16px',
          padding: '4px 16px', overflowX: 'auto',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', width: 'max-content', minWidth: '100%' }}>
          {visibleViews.map((view) => {
            const Icon = getIcon(view.icon)
            const isActive = activeWidget === view.id
            return (
              <button
                type="button"
                key={view.id}
                onClick={() => setActiveWidget(view.id)}
                style={{
                  padding: '10px 16px', border: 'none', borderRadius: '10px',
                  background: isActive ? view.color : 'var(--c-secondary-bg)',
                  color: isActive ? 'white' : 'var(--c-hint)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <Icon size={14} />
                {view.name}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            style={{
              padding: '10px 16px', border: 'none', borderRadius: '10px',
              background: 'var(--c-secondary-bg)', color: 'var(--c-hint)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <Settings size={14} />
            Configure
          </button>
        </div>
      </div>

      {ActiveComponent && (
        <Suspense fallback={<div className="empty"><div className="spinner">Loading...</div></div>}>
          <ActiveComponent />
        </Suspense>
      )}
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/shell/FacetSelector.tsx
git commit -m "feat: add FacetSelector shell component (replaces Widgets.tsx)"
```

---

### Task 16: Create shell components — HookRunner

**Files:**
- Create: `src/shell/HookRunner.tsx`

**Step 1: Write HookRunner (replaces SkillsRunner.tsx)**

This component reads the registry for action plugins, auto-generates the grid and input forms from manifest `inputs[]`.

```tsx
import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { ArrowLeft, AlertCircle, CheckCircle2, Play, Puzzle } from 'lucide-react'
import { actions } from '../plugins/registry'
import type { ActionPlugin } from '../plugins/schema'
import { useNamingPack } from '../hooks/useNamingPack'
import TapManager from './TapManager'

function getIcon(iconName: string) {
  return (LucideIcons as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

interface SkillResult {
  success: boolean
  message: string
}

export default function HookRunner() {
  const pack = useNamingPack()
  const [selected, setSelected] = useState<ActionPlugin | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SkillResult | null>(null)
  const [showTaps, setShowTaps] = useState(false)

  const handleClick = (action: ActionPlugin) => {
    setResult(null)
    if (!action.skill.inputs?.length) {
      runSkill(action, {})
    } else {
      setSelected(action)
      setInputs({})
    }
  }

  const runSkill = async (action: ActionPlugin, skillInputs: Record<string, string>) => {
    setRunning(true)
    setResult(null)

    try {
      let command = action.skill.command
      if (action.skill.inputs?.length) {
        const args = action.skill.inputs.map(i => skillInputs[i.name] || '').join(' ')
        command = `${command} ${args}`.trim()
      }

      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number }; chat?: { id: number } } } } }).Telegram?.WebApp
      const chatId = tg?.initDataUnsafe?.user?.id || tg?.initDataUnsafe?.chat?.id

      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: command, chat_id: chatId || '' }),
      })

      const data = await response.json()
      if (data.success) {
        setResult({ success: true, message: data.message || 'Done!' })
      } else {
        setResult({ success: false, message: data.error || 'Something went wrong' })
      }
    } catch {
      setResult({ success: false, message: 'Failed to run skill. Try again.' })
    } finally {
      setRunning(false)
      if (!action.skill.inputs?.length) {
        setSelected(null)
      }
    }
  }

  const handleBack = () => { setSelected(null); setResult(null); setInputs({}); setShowTaps(false) }

  if (showTaps) {
    return (
      <div style={{ padding: '8px 0' }}>
        <button type="button" onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', background: 'none', border: 'none', color: 'var(--c-text)', fontSize: '14px', cursor: 'pointer', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back to {pack.action}
        </button>
        <TapManager />
      </div>
    )
  }

  if (selected) {
    const SelectedIcon = getIcon(selected.icon)
    return (
      <div style={{ padding: '8px 0' }}>
        <button type="button" onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', background: 'none', border: 'none', color: 'var(--c-text)', fontSize: '14px', cursor: 'pointer', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SelectedIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{selected.name}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{selected.description}</div>
            </div>
          </div>
        </div>
        {result && (
          <div className="card" style={{ marginBottom: '16px', background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${result.success ? '#22c55e' : '#ef4444'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: result.success ? '#22c55e' : '#ef4444' }}>
              {result.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {result.message}
            </div>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); runSkill(selected, inputs) }}>
          {selected.skill.inputs?.map((input) => (
            <div key={input.name} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{input.label}</label>
              <input type="text" placeholder={input.placeholder} value={inputs[input.name] || ''} onChange={(e) => setInputs(prev => ({ ...prev, [input.name]: e.target.value }))} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--c-secondary-bg)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={running || (selected.skill.inputs?.some(i => i.required && !inputs[i.name]) ?? false)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--c-primary)', color: 'white', fontSize: '15px', fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {running ? 'Running...' : <><Play size={18} /> Run</>}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px', padding: '24px', color: 'white', marginBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <Puzzle size={24} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>{pack.action} & {pack.connector}</div>
        <div style={{ fontSize: '15px', opacity: 0.9 }}>Run commands and manage integrations</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {actions.map((action) => {
          const Icon = getIcon(action.icon)
          return (
            <button key={action.id} type="button" onClick={() => handleClick(action)} style={{ padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--c-secondary-bg)', color: 'var(--c-text)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', textAlign: 'left', transition: 'transform 0.2s' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{action.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{action.description}</div>
              </div>
            </button>
          )
        })}
        {/* MCP Tools entry */}
        <button type="button" onClick={() => setShowTaps(true)} style={{ padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--c-secondary-bg)', color: 'var(--c-text)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', textAlign: 'left' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
            <Puzzle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{pack.connector}</div>
            <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>Configure agent integrations</div>
          </div>
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/shell/HookRunner.tsx
git commit -m "feat: add HookRunner shell component (replaces SkillsRunner.tsx)"
```

---

### Task 17: Create shell components — TapManager

**Files:**
- Create: `src/shell/TapManager.tsx`

**Step 1: Write TapManager (replaces MCPTools.tsx with real backend integration)**

```tsx
import { useState, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import { CheckCircle2, Circle, Puzzle, RefreshCw, Settings } from 'lucide-react'
import { connectors } from '../plugins/registry'
import { useNamingPack } from '../hooks/useNamingPack'
import type { ConnectorPlugin } from '../plugins/schema'

function getIcon(iconName: string) {
  return (LucideIcons as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

export default function TapManager() {
  const pack = useNamingPack()
  const [serverStatus, setServerStatus] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/mcp')
      .then(r => r.json())
      .then(data => setServerStatus(data.servers || {}))
      .catch(() => {})
  }, [])

  const isEnabled = (connector: ConnectorPlugin) => connector.mcp.serverName in serverStatus

  const handleToggle = async (connector: ConnectorPlugin) => {
    setLoading(connector.id)
    const enabled = !isEnabled(connector)
    try {
      await fetch(`/api/mcp/${connector.mcp.serverName}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, config: connector.mcp.defaultConfig || {} }),
      })
      if (enabled) {
        setServerStatus(prev => ({ ...prev, [connector.mcp.serverName]: connector.mcp.defaultConfig || {} }))
      } else {
        setServerStatus(prev => {
          const next = { ...prev }
          delete next[connector.mcp.serverName]
          return next
        })
      }
    } catch {}
    setLoading(null)
  }

  const enabledCount = connectors.filter(c => isEnabled(c)).length
  const filtered = filter === 'all' ? connectors
    : filter === 'enabled' ? connectors.filter(c => isEnabled(c))
    : connectors

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)', borderRadius: '20px', padding: '24px', color: 'white', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{pack.connector}</div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '4px' }}>{enabledCount}/{connectors.length}</div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>enabled</div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Puzzle size={24} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', padding: '4px 0' }}>
        {['all', 'enabled'].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: filter === f ? '#6366f1' : 'var(--c-secondary-bg)', color: filter === f ? 'white' : 'var(--c-hint)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(connector => {
          const Icon = getIcon(connector.icon)
          const enabled = isEnabled(connector)
          const isLoading = loading === connector.id
          return (
            <div key={connector.id} className="card" style={{ marginBottom: 0, padding: '14px', borderLeft: enabled ? '3px solid #6366f1' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: enabled ? `${connector.color}20` : 'var(--c-secondary-bg)', color: enabled ? connector.color : 'var(--c-hint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--c-text)' }}>{connector.name}</span>
                  <div style={{ fontSize: '13px', color: 'var(--c-hint)', lineHeight: '1.4' }}>{connector.description}</div>
                </div>
                <button type="button" onClick={() => handleToggle(connector)} disabled={isLoading} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: enabled ? '#22c55e' : 'var(--c-secondary-bg)', color: enabled ? 'white' : 'var(--c-hint)', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isLoading ? <><RefreshCw size={14} className="spinner" /> ...</> : enabled ? <><CheckCircle2 size={14} /> On</> : <><Circle size={14} /> Off</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: '16px', fontSize: '13px', color: 'var(--c-hint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Settings size={14} />
          <span>MCP (Model Context Protocol)</span>
        </div>
        <div>Changes are written to OpenClaw config and hot-applied automatically.</div>
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/shell/TapManager.tsx
git commit -m "feat: add TapManager shell component with real OpenClaw config integration"
```

---

### Task 18: Create shell components — Settings + CommandPalette

**Files:**
- Create: `src/shell/Settings.tsx`
- Create: `src/shell/CommandPalette.tsx`

**Step 1: Write Settings component**

`src/shell/Settings.tsx`:
```tsx
import * as LucideIcons from 'lucide-react'
import { Eye, EyeOff, RotateCcw, Save, CheckCircle2, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import type { ViewPlugin } from '../plugins/schema'

function getIcon(iconName: string) {
  return (LucideIcons as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

interface PluginSettingsProps {
  views: ViewPlugin[]
  isEnabled: (id: string) => boolean
  onToggle: (id: string) => void
  onReset: () => void
}

export default function PluginSettings({ views, isEnabled, onToggle, onReset }: PluginSettingsProps) {
  const [saved, setSaved] = useState(false)
  const enabledCount = views.filter(v => isEnabled(v.id)).length

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '20px', padding: '24px', color: 'white', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>Settings</div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>Customize your dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 700 }}>{enabledCount}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Enabled</div></div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}><div style={{ fontSize: '28px', fontWeight: 700 }}>{views.length - enabledCount}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Hidden</div></div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}><div style={{ fontSize: '28px', fontWeight: 700 }}>{views.length}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Total</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {views.map(view => {
          const Icon = getIcon(view.icon)
          const enabled = isEnabled(view.id)
          return (
            <button type="button" key={view.id} onClick={() => onToggle(view.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: enabled ? `${view.color}10` : 'var(--c-secondary-bg)', borderRadius: '14px', cursor: 'pointer', border: enabled ? `2px solid ${view.color}` : '2px solid transparent', opacity: enabled ? 1 : 0.6, width: '100%', textAlign: 'inherit', color: 'inherit', font: 'inherit' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: enabled ? view.color : 'var(--c-bg)', color: enabled ? 'white' : 'var(--c-hint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: enabled ? 'var(--c-text)' : 'var(--c-hint)', marginBottom: '2px' }}>{view.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>{view.description}</div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: enabled ? view.color : 'var(--c-bg)', color: enabled ? 'white' : 'var(--c-hint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {enabled ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={handleSave} style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '12px', background: saved ? '#22c55e' : '#6366f1', color: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {saved ? <><CheckCircle2 size={18} /> Saved!</> : <><Save size={18} /> Save</>}
        </button>
        <button type="button" onClick={onReset} style={{ padding: '14px', border: 'none', borderRadius: '12px', background: 'var(--c-secondary-bg)', color: 'var(--c-text)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <RotateCcw size={18} /> Reset
        </button>
      </div>
    </>
  )
}
```

**Step 2: Write CommandPalette that reads from registry**

`src/shell/CommandPalette.tsx`:
Copy the existing `CommandPalette.tsx` but replace `COMMAND_GROUPS` with a dynamically generated list from the registry:

```tsx
// At the top, import from registry instead of hardcoding:
import { plugins } from '../plugins/registry'
import { useNamingPack } from '../hooks/useNamingPack'
import * as LucideIcons from 'lucide-react'

// Replace COMMAND_GROUPS with:
function buildCommandGroups(pack: NamingPack) {
  const viewCommands = plugins
    .filter(p => p.type === 'view')
    .map(p => ({
      id: p.id,
      name: p.name,
      subtitle: p.description,
      icon: getIcon(p.icon),
      color: p.color,
      action: `widget:${p.id}`,
    }))

  const actionCommands = plugins
    .filter(p => p.type === 'action')
    .map(p => ({
      id: p.id,
      name: p.name,
      subtitle: p.description,
      icon: getIcon(p.icon),
      color: p.color,
      action: `tool:${p.id}`,
    }))

  const connectorCommands = plugins
    .filter(p => p.type === 'connector')
    .map(p => ({
      id: p.id,
      name: p.name,
      subtitle: p.description,
      icon: getIcon(p.icon),
      color: p.color,
      action: `connector:${p.id}`,
    }))

  return [
    { id: 'views', name: pack.view, icon: LayoutGrid, commands: viewCommands },
    { id: 'actions', name: pack.action, icon: Zap, commands: actionCommands },
    { id: 'connectors', name: pack.connector, icon: Puzzle, commands: connectorCommands },
  ]
}
```

Keep the rest of the CommandPalette component's UI logic (search, keyboard nav, rendering) the same — just driven from the registry instead of hardcoded arrays.

**Step 3: Commit**

```bash
git add src/shell/Settings.tsx src/shell/CommandPalette.tsx
git commit -m "feat: add Settings and CommandPalette shell components (registry-driven)"
```

---

### Task 19: Update App.tsx to use new shell components

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace old component imports with shell imports**

Replace:
```ts
import CommandPalette from './components/CommandPalette'
import SessionStatus from './components/SessionStatus'
import SkillsRunner from './components/SkillsRunner'
import Widgets from './components/Widgets'
```

With:
```ts
import CommandPalette from './shell/CommandPalette'
import FacetSelector from './shell/FacetSelector'
import HookRunner from './shell/HookRunner'
import { useNamingPack } from './hooks/useNamingPack'
```

**Step 2: Update the tab navigation to use naming pack labels**

Inside the component, add:
```ts
const pack = useNamingPack()
```

Change the nav button labels from hardcoded 'Widgets', 'Status', 'Tools' to `pack.view`, 'Status', `pack.action`.

**Step 3: Update main content rendering**

Replace:
```tsx
{activeTab === 'widgets' && <Widgets activeWidget={activeWidget} setActiveWidget={setActiveWidget} />}
{activeTab === 'status' && <SessionStatus />}
{activeTab === 'tools' && <SkillsRunner />}
```

With:
```tsx
{activeTab === 'widgets' && <FacetSelector activeWidget={activeWidget} setActiveWidget={setActiveWidget} />}
{activeTab === 'status' && <SessionStatus />}
{activeTab === 'tools' && <HookRunner />}
```

Note: SessionStatus is now at `../plugins/session-status/widget.tsx` — import it from there, or keep the status tab rendering the component directly via lazy import.

**Step 4: Verify the app builds**

Run: `cd /Users/kostandin/Projects/claws/miniapp && pnpm build 2>&1 | tail -20`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: wire App.tsx to new shell components and plugin registry"
```

---

## Phase 4: Cleanup

### Task 20: Remove old component files and api-server.ts

**Files:**
- Delete: `src/components/Widgets.tsx`
- Delete: `src/components/WidgetSettings.tsx`
- Delete: `src/components/SkillsRunner.tsx`
- Delete: `src/components/MCPTools.tsx`
- Delete: `src/components/CommandPalette.tsx`
- Archive: `api-server.ts` (rename to `api-server.ts.bak` initially, delete after verification)

**Step 1: Remove old files**

```bash
cd /Users/kostandin/Projects/claws/miniapp
rm src/components/Widgets.tsx src/components/WidgetSettings.tsx src/components/SkillsRunner.tsx src/components/MCPTools.tsx src/components/CommandPalette.tsx
mv api-server.ts api-server.ts.bak
```

**Step 2: Remove the now-empty src/components directory if empty**

```bash
rmdir src/components 2>/dev/null || true
```

**Step 3: Verify build still passes**

Run: `pnpm build 2>&1 | tail -10`
Expected: Build succeeds

**Step 4: If build passes, delete the backup**

```bash
rm api-server.ts.bak
```

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old component files and monolithic api-server"
```

---

### Task 21: Update Vite config for dev proxy

**Files:**
- Modify: `vite.config.ts`

**Step 1: Add proxy config so frontend dev server forwards /api to Hono**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

**Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "fix: add Vite dev proxy for /api to backend"
```

---

### Task 22: Final verification

**Step 1: Start backend**

Run: `cd /Users/kostandin/Projects/claws/miniapp && pnpm server &`
Expected: "Curateur API server running on port 3002"

**Step 2: Start frontend**

Run: `pnpm dev &`
Expected: Vite dev server starts on port 3000

**Step 3: Verify API endpoints work**

Run: `curl http://localhost:3002/api/health`
Expected: `{"status":"ok",...}`

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 5: Stop dev servers and commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup after plugin architecture migration"
```

---

## Summary

| Phase | Tasks | What it does |
|-------|-------|-------------|
| **1: Foundation** | 1-7 | Dependencies, schema types, naming packs, all 25 manifests, registry |
| **2: Backend** | 8-12 | Shared utils, middleware, extract 10 route files, Hono server |
| **3: Frontend** | 13-19 | Move widgets, hooks, 4 shell components, rewire App.tsx |
| **4: Cleanup** | 20-22 | Delete old files, add dev proxy, final verification |

**Total: 22 tasks, ~25 new files, 5 deleted files, 3 modified files**
