# Plugin Architecture Design for Curateur

**Date:** 2026-03-06
**Status:** Approved

## Overview

Replace the current three duplicated registries (ALL_WIDGETS, SKILLS, COMMAND_GROUPS) with a unified, manifest-driven plugin system. Migrate the monolithic `api-server.ts` to Hono with auto-mounted plugin routes.

## Three Plugin Tiers

| Tier | Internal Type | Default Display Name | Purpose |
|------|--------------|---------------------|---------|
| **View** | `view` | Facets | Visual dashboard widgets |
| **Action** | `action` | Hooks | Executable actions tied to `$WORKSPACE_DIR/agents/*.sh` |
| **Connector** | `connector` | Taps | MCP server config for OpenClaw |

Display names are cosmetic, chosen from a naming pack during the setup script. 11 packs available:

| # | Theme | View | Action | Connector |
|---|-------|------|--------|-----------|
| 0 | Default | Facets | Hooks | Taps |
| 1 | Sci-Fi | Scanners | Protocols | Relays |
| 2 | Military | Recon | Ops | Comms |
| 3 | Nautical | Scopes | Helms | Moorings |
| 4 | Cyberpunk | Feeds | Jacks | Uplinks |
| 5 | Arcane | Runes | Spells | Portals |
| 6 | Mechanical | Gauges | Levers | Gears |
| 7 | Biological | Cortexes | Reflexes | Synapses |
| 8 | Musical | Tracks | Beats | Channels |
| 9 | Culinary | Plates | Recipes | Spices |
| 10 | Botanical | Blooms | Roots | Vines |

## Plugin Directory Structure

```
src/plugins/
├── registry.ts              # Build-time generated, exports typed plugin list
├── schema.ts                # Manifest TypeScript types + validation
├── loader.ts                # Scans manifests, generates registry
│
├── exchange-rate/
│   ├── manifest.json
│   ├── widget.tsx
│   └── routes.ts
│
├── omad-tracker/
│   ├── manifest.json
│   ├── widget.tsx
│   └── routes.ts
│
├── new-session/
│   ├── manifest.json        # Action — no widget
│   └── routes.ts            # Optional
│
├── mcp-filesystem/
│   ├── manifest.json        # Connector
│   └── config-panel.tsx     # Optional config UI
│
└── flashcards/
    ├── manifest.json
    ├── widget.tsx
    └── data/
        └── vocabulary.json
```

**Rules:**
- Every plugin has exactly one `manifest.json` — the source of truth
- `widget.tsx` only exists for views (and connectors with config UI)
- `routes.ts` exports a Hono router, auto-mounted at the declared API prefix
- Actions reference `skill.agent` which resolves to `$WORKSPACE_DIR/agents/<name>.sh`
  - Agent directory: `/root/.openclaw/workspace/agents/*.sh`
- Co-located data lives in a `data/` subdirectory

## Manifest Schema

### Base (shared by all plugins)

```ts
interface PluginBase {
  id: string
  name: string
  icon: string              // Lucide icon name
  color: string             // Hex color
  description: string
  type: 'view' | 'action' | 'connector'
  enabled?: boolean         // Default: true
}
```

### View (Facet)

```ts
interface ViewPlugin extends PluginBase {
  type: 'view'
  widget: {
    component: string       // Relative path to .tsx
    defaultEnabled: boolean
    refreshInterval?: number
  }
  api?: {
    routes: string
    prefix: string          // e.g. "/api/exchange-rate"
  }
}
```

### Action (Hook)

```ts
interface ActionPlugin extends PluginBase {
  type: 'action'
  skill: {
    agent: string           // Script name in $WORKSPACE_DIR/agents/
    command: string          // Telegram bot command
    inputs?: SkillInput[]
    component?: string      // Optional custom UI
  }
  api?: {
    routes: string
    prefix: string
  }
}

interface SkillInput {
  name: string
  label: string
  type: 'text' | 'number' | 'toggle' | 'select'
  required?: boolean
  default?: string | number | boolean
  options?: { label: string; value: string }[]
}
```

### Connector (Tap)

```ts
interface ConnectorPlugin extends PluginBase {
  type: 'connector'
  mcp: {
    serverName: string
    configSchema?: Record<string, SkillInput>
    defaultConfig?: Record<string, unknown>
  }
  component?: string
}

type PluginManifest = ViewPlugin | ActionPlugin | ConnectorPlugin
```

### Example Manifests

**OMAD Tracker (View):**
```json
{
  "id": "omad-tracker",
  "name": "OMAD Tracker",
  "type": "view",
  "icon": "Timer",
  "color": "#f59e0b",
  "description": "Track fasting and OMAD streaks",
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

**New Session (Action):**
```json
{
  "id": "new-session",
  "name": "New Session",
  "type": "action",
  "icon": "Plus",
  "color": "#6366f1",
  "description": "Start a new OpenClaw session",
  "skill": {
    "agent": "new-session.sh",
    "command": "/new_session",
    "inputs": []
  }
}
```

**Filesystem MCP (Connector):**
```json
{
  "id": "mcp-filesystem",
  "name": "Filesystem",
  "type": "connector",
  "icon": "FolderTree",
  "color": "#8b5cf6",
  "description": "File system access for OpenClaw agents",
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

## Backend Architecture (Hono)

Replace monolithic `api-server.ts` with:

```
api/
├── server.ts              # Hono app entry, plugin route loader
├── middleware/
│   ├── auth.ts            # Telegram auth + secret key validation
│   └── cors.ts            # CORS config
└── lib/
    ├── workspace.ts       # $WORKSPACE_DIR helpers, file read/write
    ├── telegram.ts        # Telegram Bot API client
    └── shell.ts           # Safe shell execution wrapper
```

**server.ts core logic:**

```ts
import { Hono } from 'hono'
import { plugins } from '../src/plugins/registry'

const app = new Hono()

app.use('*', cors())
app.use('/api/*', auth())

// Auto-mount plugin routes
for (const plugin of plugins) {
  if (plugin.api?.routes) {
    const router = await import(`../src/plugins/${plugin.id}/routes`)
    app.route(plugin.api.prefix, router.default)
  }
}

// Shared: skill execution
app.post('/api/skill/:id/execute', async (c) => {
  // Resolve agent script, validate inputs, execute or forward to Telegram
})

// Shared: MCP config management
app.post('/api/mcp/:id/config', async (c) => {
  // Write to ~/.openclaw/openclaw.json (JSON5)
})
```

**Plugin route example (OMAD):**

```ts
import { Hono } from 'hono'
import { readWorkspaceFile } from '../../api/lib/workspace'

const router = new Hono()

router.get('/', async (c) => {
  const memory = await readWorkspaceFile('MEMORY.md')
  const entries = parseOMADEntries(memory)
  return c.json({ entries })
})

export default router
```

## Frontend Architecture

```
src/
├── app.tsx
├── plugins/
│   ├── registry.ts            # Generated
│   ├── schema.ts
│   ├── loader.ts
│   └── <plugin-dirs>/
├── shell/
│   ├── TabBar.tsx             # Three tabs using naming pack labels
│   ├── FacetSelector.tsx      # Reads registry for views
│   ├── HookRunner.tsx         # Auto-generates action grid from manifests
│   ├── TapManager.tsx         # MCP connector config panels
│   ├── CommandPalette.tsx     # Reads registry — unified, no separate list
│   └── Settings.tsx           # Plugin enable/disable from registry
├── hooks/
│   ├── usePlugin.ts           # Scoped fetch wrapper per plugin
│   ├── useSettings.ts         # localStorage for enabled plugins
│   └── useNamingPack.ts       # Display names for tiers
└── lib/
    └── time-utils.ts
```

**Key changes from current architecture:**

| Current | New |
|---------|-----|
| `ALL_WIDGETS` in Widgets.tsx + WidgetSettings.tsx | Single `registry.ts` |
| `SKILLS` in SkillsRunner.tsx | Registry + auto-generated forms from `inputs[]` |
| `COMMAND_GROUPS` in CommandPalette.tsx | Registry, categorized by type |
| `MCPTools.tsx` mockup | `TapManager.tsx` with real OpenClaw config I/O |
| Per-component `fetch()` | `usePlugin(pluginId)` scoped fetcher |
| No error boundaries | Each plugin wrapped in error boundary |

**Dynamic component loading:**

```tsx
const PluginComponent = lazy(
  () => import(`./plugins/${activePlugin.id}/widget.tsx`)
)

<ErrorBoundary fallback={<PluginError plugin={activePlugin} />}>
  <Suspense fallback={<Loading />}>
    <PluginComponent />
  </Suspense>
</ErrorBoundary>
```

## MCP Tap Integration

Taps manage OpenClaw's MCP server configuration:

- **Config file:** `~/.openclaw/openclaw.json` (JSON5 format)
- **Reload:** OpenClaw hot-reloads on file change (hybrid mode by default)
- **No restart endpoint needed**

Flow:
```
Dashboard UI → POST /api/mcp/:id/config → Read openclaw.json (JSON5)
                                        → Merge tap config into mcp_servers
                                        → Write openclaw.json
                                        → OpenClaw auto-detects, hot-applies
```

## Migration Strategy

Big bang — all 17 existing components converted to plugin format:

**Views (12):** exchange-rate, omad-tracker, wellbeing, cost-heatmap, system-monitor, cron-manager, flashcards, job-search, voice-notes, voice-to-text, project-updates, session-status

**Actions (existing skills from SkillsRunner.tsx):** new-session, reset-skills, daily-update, etc.

**Connectors (from MCPTools mockup):** filesystem, posthog, slack, github, etc.

## Generated Registry

Build-time loader produces:

```ts
// Auto-generated — do not edit
import type { PluginManifest } from './schema'

export const plugins: PluginManifest[] = [...]

export const facets = plugins.filter(p => p.type === 'view')
export const hooks = plugins.filter(p => p.type === 'action')
export const taps = plugins.filter(p => p.type === 'connector')
```
