# Curateur

Personal dashboard as a Telegram Mini App, powered by [OpenClaw](https://github.com/AiClaw/openclaw). Built with a manifest-driven plugin architecture.

## Stack

- **Frontend** — React 18, TypeScript, Vite 5, Lucide icons
- **Backend** — Hono (served via @hono/node-server, runs with tsx)
- **Linting** — Biome (format + lint + import sorting)
- **Package manager** — pnpm

## Quick Start

```bash
pnpm install
pnpm setup         # interactive config wizard
pnpm dev           # frontend on :3000
pnpm server        # api on :3002
```

The setup wizard writes `.env` (server secrets) and `curateur.config.json` (app preferences like naming pack and enabled plugins).

## Scripts

| Command | Description |
|---|---|
| `pnpm setup` | Interactive setup wizard |
| `pnpm dev` | Start Vite dev server (proxies /api to :3002) |
| `pnpm build` | Typecheck + production build |
| `pnpm server` | Start Hono API server |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run Biome checks |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format all source files |
| `pnpm typecheck` | Typecheck frontend |
| `pnpm typecheck:server` | Typecheck API server |

## Plugin Architecture

All features are plugins. Three tiers with configurable display names (11 themes):

| Tier | Default Name | Purpose | Count |
|------|-------------|---------|-------|
| **View** | Facets | Dashboard widgets | 12 |
| **Action** | Hooks | Executable commands tied to agent scripts | 5 |
| **Connector** | Taps | MCP server config for OpenClaw | 8 |

Each plugin is a self-contained directory:

```
src/plugins/<name>/
├── manifest.json    # Metadata, icon, color, type, API prefix
├── widget.tsx       # React component (views only)
└── routes.ts        # Hono router (if plugin has an API)
```

### Adding a New Plugin

1. Create `src/plugins/<name>/manifest.json`
2. Add `widget.tsx` (for views) or `routes.ts` (for API-backed plugins)
3. Import the manifest in `src/plugins/registry.ts`

### View Plugins

| Plugin | Description |
|---|---|
| exchange-rate | USD/ALL currency tracker with alerts |
| system-monitor | Live CPU, memory, disk, network stats |
| cron-manager | Manage agent cron schedules |
| omad-tracker | Fasting streak tracker with daily history |
| cost-heatmap | LLM usage analytics (30-day heatmap) |
| voice-notes | Voice recording with playback |
| voice-to-text | Voice message transcription viewer |
| job-search | Job listings with filters |
| flashcards | German language flashcards (A2/B1) |
| wellbeing | Mood tracking with weekly charts |
| project-updates | Daily standup notes per project |
| session-status | OpenClaw infrastructure status |

### Action Plugins

| Plugin | Command | Description |
|---|---|---|
| loom-transcript | `summarize loom <url>` | Get video summaries from Loom URLs |
| search-memory | `search memory <query>` | Find past notes and conversations |
| system-status | `/status` | Check OpenClaw health |
| new-session | `/new` | Start fresh session |
| reset-session | `/reset` | Clear context and restart |

### Connector Plugins (MCP)

filesystem, github, git, postgres, fetch, slack, brave-search, puppeteer

Connectors manage OpenClaw's MCP server configuration at `~/.openclaw/openclaw.json`. Changes are hot-applied by OpenClaw automatically.

## Project Structure

```
miniapp/
├── src/
│   ├── plugins/             # All plugin directories
│   │   ├── <name>/
│   │   │   ├── manifest.json
│   │   │   ├── widget.tsx
│   │   │   └── routes.ts
│   │   ├── registry.ts      # Central plugin registry
│   │   ├── schema.ts        # TypeScript types for manifests
│   │   └── naming-packs.ts  # 11 naming themes
│   ├── shell/               # App shell components
│   │   ├── FacetSelector.tsx # View tab (widget selector + lazy loader)
│   │   ├── HookRunner.tsx   # Action tab (skill grid + forms)
│   │   ├── TapManager.tsx   # Connector config panel
│   │   ├── CommandPalette.tsx# Cmd+K search (registry-driven)
│   │   └── Settings.tsx     # Plugin toggles + theme picker
│   ├── hooks/               # React hooks
│   │   ├── usePlugin.ts     # Scoped fetch per plugin
│   │   ├── useSettings.ts   # Enabled plugins (server + localStorage)
│   │   └── useNamingPack.ts # Active naming theme
│   ├── lib/
│   │   └── time-utils.ts    # UTC-to-local time helpers
│   ├── App.tsx              # Auth gate, tabs, command palette
│   ├── App.css              # Telegram-themed styles
│   └── main.tsx             # Entry point
├── api/
│   ├── server.ts            # Hono entry point (auto-mounts plugin routes)
│   ├── middleware/
│   │   ├── cors.ts
│   │   └── auth.ts
│   └── lib/
│       ├── workspace.ts     # File I/O helpers
│       ├── telegram.ts      # Telegram Bot API client
│       └── shell.ts         # Safe shell execution
├── scripts/
│   └── setup.ts             # Interactive setup wizard
├── docs/plans/              # Architecture design docs
├── curateur.config.json     # App preferences (naming pack, plugins)
├── .env                     # Server secrets (gitignored)
├── .env.example
├── biome.json
├── tsconfig.json            # Frontend TS config
├── tsconfig.server.json     # Backend TS config
├── vite.config.ts
└── package.json
```

## API Endpoints

Served by `api/server.ts` on port 3002 (configurable via `PORT`).

### Plugin Routes

Each plugin with an `api` block in its manifest gets auto-mounted:

| Endpoint | Method | Plugin |
|---|---|---|
| `/api/system` | GET | system-monitor |
| `/api/omad` | GET | omad-tracker |
| `/api/costs` | GET | cost-heatmap |
| `/api/jobs` | GET | job-search |
| `/api/wellbeing` | GET | wellbeing |
| `/api/projects` | GET | project-updates |
| `/api/voice` | GET | voice-notes |
| `/api/voice/stats` | GET | voice-notes |
| `/api/voice-transcripts` | GET | voice-to-text |
| `/api/crons` | GET/POST | cron-manager |
| `/api/status` | GET | session-status |

### Shared Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/config` | GET/POST | App preferences (naming pack, enabled plugins) |
| `/api/message` | POST | Send message via Telegram Bot API |
| `/api/skill/:id/execute` | POST | Execute an action plugin |
| `/api/mcp` | GET | List MCP server status from OpenClaw config |
| `/api/mcp/:id/config` | POST | Enable/disable MCP server |

## Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|---|---|---|
| `WORKSPACE_DIR` | `/root/.openclaw/workspace` | OpenClaw data directory |
| `OPENCLAW_CONFIG_PATH` | `~/.openclaw/openclaw.json` | OpenClaw config file |
| `TELEGRAM_BOT_TOKEN` | (auto-detected) | Telegram bot token |
| `DEFAULT_CHAT_ID` | | Default Telegram chat ID |
| `PORT` | `3002` | API server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `VITE_SECRET_KEY` | | Browser auth fallback key |

### App Preferences (curateur.config.json)

```json
{
  "namingPack": 0,
  "plugins": {
    "views": ["exchange-rate", "system-monitor", ...],
    "actions": ["new-session", ...],
    "connectors": ["mcp-filesystem", ...]
  }
}
```

Generated by `pnpm setup` or editable from in-app Settings.

### Naming Packs

| # | Theme | Views | Actions | Connectors |
|---|-------|-------|---------|------------|
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

## Auth

The app authenticates via Telegram WebApp context or a URL key parameter (`?key=...`). Browser sessions persist via `sessionStorage`.

## Telegram Setup

1. Message [@BotFather](https://t.me/BotFather)
2. Send `/newapp` or go to Bot Settings > Menu Button
3. Set the URL to your deployed app
4. For local testing: `ngrok http 3000`, use the HTTPS URL

## Production

```bash
pnpm build
```

Deploy `dist/` to any static host. Run `pnpm server` for the backend.

### Keeping the API Server Running

#### Systemd (Recommended)

```bash
sudo tee /etc/systemd/system/curateur-api.service > /dev/null << 'EOF'
[Unit]
Description=Curateur Miniapp API Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/miniapp
ExecStart=/root/.openclaw/workspace/miniapp/node_modules/.bin/tsx api/server.ts
Restart=always
RestartSec=5
KillMode=process
Environment=HOME=/root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable curateur-api
sudo systemctl start curateur-api
```

#### PM2

```bash
npm install -g pm2
pm2 start "pnpm server" --name curateur-api
pm2 save && pm2 startup
```

### Data Sources

| Data | Location |
|------|----------|
| OMAD logs | `$WORKSPACE_DIR/MEMORY.md` |
| Wellbeing | `$WORKSPACE_DIR/wellbeing/moods.json` |
| Projects | `$WORKSPACE_DIR/project-updates/updates.json` |
| Jobs | `$WORKSPACE_DIR/job-search/jobs.json` |
| Voice notes | `$WORKSPACE_DIR/voice-notes/` |
| Transcripts | `$WORKSPACE_DIR/voice-transcripts/` |
| Agent scripts | `$WORKSPACE_DIR/agents/*.sh` |
| MCP config | `~/.openclaw/openclaw.json` |
