import * as readline from 'node:readline/promises'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { execSync } from 'node:child_process'

// ---------- Types ----------

interface PluginManifest {
  id: string
  name: string
  type: 'view' | 'action' | 'connector'
  description: string
}

interface NamingPack {
  id: number
  theme: string
  view: string
  action: string
  connector: string
}

interface CurateurConfig {
  namingPack: number
  plugins: {
    views: string[]
    actions: string[]
    connectors: string[]
  }
}

// ---------- Helpers ----------

const ROOT = path.resolve(import.meta.dirname, '..')
const PLUGINS_DIR = path.join(ROOT, 'src', 'plugins')

function bold(s: string) { return `\x1b[1m${s}\x1b[0m` }
function dim(s: string) { return `\x1b[2m${s}\x1b[0m` }
function green(s: string) { return `\x1b[32m${s}\x1b[0m` }
function cyan(s: string) { return `\x1b[36m${s}\x1b[0m` }
function yellow(s: string) { return `\x1b[33m${s}\x1b[0m` }

async function ask(rl: readline.Interface, question: string, defaultVal?: string): Promise<string> {
  const suffix = defaultVal ? ` [${defaultVal}]` : ''
  const answer = await rl.question(`  ${question}${suffix}: `)
  return answer.trim() || defaultVal || ''
}

function loadManifests(): PluginManifest[] {
  const manifests: PluginManifest[] = []
  const dirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const manifestPath = path.join(PLUGINS_DIR, d.name, 'manifest.json')
    if (fs.existsSync(manifestPath)) {
      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      manifests.push({ id: raw.id, name: raw.name, type: raw.type, description: raw.description })
    }
  }
  return manifests
}

function loadNamingPacks(): NamingPack[] {
  // Read naming packs from the TS source file by parsing the array literal
  // Since we cannot import the TS module directly, we hardcode the data
  // (it is static and rarely changes).
  return [
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
}

function tryAutoDetectBotToken(configPath: string): string | undefined {
  try {
    const resolved = configPath.replace(/^~/, process.env.HOME || '')
    if (!fs.existsSync(resolved)) return undefined
    const config = JSON.parse(fs.readFileSync(resolved, 'utf8'))
    return config.telegramBotToken || config.telegram_bot_token || undefined
  } catch {
    return undefined
  }
}

function generateSecret(length = 32): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length)
}

// ---------- Main ----------

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  // 1. Welcome banner
  console.log('')
  console.log(cyan('  ╔══════════════════════════════════════╗'))
  console.log(cyan('  ║') + bold('        Curateur Setup Wizard         ') + cyan('║'))
  console.log(cyan('  ╚══════════════════════════════════════╝'))
  console.log('')
  console.log(dim('  This wizard will configure your environment,'))
  console.log(dim('  naming theme, and active plugins.'))
  console.log('')

  // 2. Environment variables
  console.log(bold('  --- Environment Variables ---'))
  console.log('')

  const workspaceDir = await ask(rl, 'Workspace directory', '/root/.openclaw/workspace')
  const openclawConfigPath = await ask(rl, 'OpenClaw config path', '~/.openclaw/openclaw.json')

  // Try auto-detect bot token
  const autoToken = tryAutoDetectBotToken(openclawConfigPath)
  if (autoToken) {
    console.log(green('  Auto-detected Telegram bot token from OpenClaw config'))
  }
  const botToken = await ask(rl, 'Telegram bot token', autoToken || '')
  const defaultChatId = await ask(rl, 'Default chat ID', '')
  const corsOrigin = await ask(rl, 'CORS origin', '*')
  const port = await ask(rl, 'API server port', '3002')
  const secretKey = await ask(rl, 'Secret key', generateSecret())

  // Write .env
  const envContent = [
    '# Curateur Miniapp Environment Variables',
    '# Generated by pnpm setup',
    '',
    `WORKSPACE_DIR=${workspaceDir}`,
    `OPENCLAW_CONFIG_PATH=${openclawConfigPath}`,
    `TELEGRAM_BOT_TOKEN=${botToken}`,
    `DEFAULT_CHAT_ID=${defaultChatId}`,
    `CORS_ORIGIN=${corsOrigin}`,
    `PORT=${port}`,
    `VITE_SECRET_KEY=${secretKey}`,
    '',
  ].join('\n')

  fs.writeFileSync(path.join(ROOT, '.env'), envContent)
  console.log(green('  Wrote .env'))
  console.log('')

  // 3. Validate OpenClaw
  console.log(bold('  --- OpenClaw Validation ---'))
  console.log('')
  try {
    const version = execSync('/usr/bin/openclaw --version 2>/dev/null', { encoding: 'utf8' }).trim()
    console.log(green(`  OpenClaw found: ${version}`))
  } catch {
    console.log(yellow('  OpenClaw binary not found at /usr/bin/openclaw (optional)'))
  }

  const resolvedConfig = openclawConfigPath.replace(/^~/, process.env.HOME || '')
  if (fs.existsSync(resolvedConfig)) {
    console.log(green(`  Config file found: ${resolvedConfig}`))
  } else {
    console.log(yellow(`  Config file not found: ${resolvedConfig} (optional)`))
  }
  console.log('')

  // 4. Naming pack
  console.log(bold('  --- Naming Theme ---'))
  console.log('')
  const packs = loadNamingPacks()
  for (const p of packs) {
    console.log(`  [${p.id.toString().padStart(2)}] ${p.theme.padEnd(12)} ${dim(`${p.view} | ${p.action} | ${p.connector}`)}`)
  }
  console.log('')
  const packInput = await ask(rl, 'Select theme number', '0')
  const packId = Math.max(0, Math.min(10, parseInt(packInput, 10) || 0))
  const chosenPack = packs[packId]
  console.log(green(`  Selected: ${chosenPack.theme}`))
  console.log('')

  // 5. Plugin selection
  const manifests = loadManifests()
  const viewPlugins = manifests.filter(p => p.type === 'view')
  const actionPlugins = manifests.filter(p => p.type === 'action')
  const connectorPlugins = manifests.filter(p => p.type === 'connector')

  const selectedViews = await selectPlugins(rl, 'Views', viewPlugins)
  const selectedActions = await selectPlugins(rl, 'Actions', actionPlugins)
  const selectedConnectors = await selectPlugins(rl, 'Connectors', connectorPlugins)

  // 6. Write curateur.config.json
  const config: CurateurConfig = {
    namingPack: packId,
    plugins: {
      views: selectedViews,
      actions: selectedActions,
      connectors: selectedConnectors,
    },
  }

  const configPath = path.join(ROOT, 'curateur.config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  console.log(green('  Wrote curateur.config.json'))
  console.log('')

  // 7. Summary
  console.log(bold('  --- Setup Complete ---'))
  console.log('')
  console.log(`  Theme:      ${cyan(chosenPack.theme)} (${chosenPack.view} / ${chosenPack.action} / ${chosenPack.connector})`)
  console.log(`  Views:      ${selectedViews.length} enabled`)
  console.log(`  Actions:    ${selectedActions.length} enabled`)
  console.log(`  Connectors: ${selectedConnectors.length} enabled`)
  console.log(`  Port:       ${port}`)
  console.log('')
  console.log(dim('  Run `pnpm dev` and `pnpm server` to start'))
  console.log('')

  rl.close()
}

async function selectPlugins(
  rl: readline.Interface,
  label: string,
  plugins: PluginManifest[],
): Promise<string[]> {
  if (plugins.length === 0) return []

  console.log(bold(`  --- ${label} ---`))
  console.log('')
  for (let i = 0; i < plugins.length; i++) {
    console.log(`  [${i}] ${plugins[i].name.padEnd(20)} ${dim(plugins[i].description)}`)
  }
  console.log('')
  console.log(dim('  All enabled by default. Enter numbers to toggle off (e.g. "1 3"),'))
  console.log(dim('  or press Enter to keep all.'))
  const input = await ask(rl, 'Toggle off')

  const toggleOff = new Set<number>()
  if (input) {
    for (const part of input.split(/[\s,]+/)) {
      const n = parseInt(part, 10)
      if (!Number.isNaN(n) && n >= 0 && n < plugins.length) {
        toggleOff.add(n)
      }
    }
  }

  const selected = plugins.filter((_, i) => !toggleOff.has(i)).map(p => p.id)
  console.log(green(`  ${selected.length}/${plugins.length} enabled`))
  console.log('')
  return selected
}

main().catch((err) => {
  console.error('Setup failed:', err)
  process.exit(1)
})
