# Curateur

Personal dashboard as a Telegram Mini App. Built with React, TypeScript, and Vite.

## Stack

- **Frontend** — React 18, TypeScript, Vite, Lucide icons
- **Backend** — Node.js HTTP server (TypeScript, runs via tsx)
- **Linting** — Biome (format + lint + import sorting)
- **Package manager** — pnpm

## Quick Start

```bash
pnpm install
pnpm dev          # frontend on :3000
pnpm server       # api on :3002
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Typecheck + production build |
| `pnpm preview` | Preview production build |
| `pnpm server` | Start API server |
| `pnpm lint` | Run Biome checks |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format all source files |
| `pnpm typecheck` | Typecheck frontend |
| `pnpm typecheck:server` | Typecheck API server |

## Widgets

| Widget | Description |
|---|---|
| ExchangeRate | USD/ALL currency tracker with alerts |
| OMADTracker | Fasting streak tracker with daily history |
| Wellbeing | Mood tracking with weekly charts |
| ProjectUpdates | Daily standup notes per project |
| SystemMonitor | Live CPU, memory, disk, network stats |
| CostHeatmap | LLM usage analytics (30-day heatmap) |
| JobSearch | Job listings with filters |
| Flashcards | German language flashcards (A2/B1) |
| VoiceNotes | Voice recording with playback |
| VoiceToText | Voice message transcription viewer |

Other features: command palette (Cmd+K), MCP tools manager, widget settings, skills runner.

## API Endpoints

All `GET` only. Served by `api-server.ts` on port 3002 (configurable via `PORT`).

| Endpoint | Returns |
|---|---|
| `/api/status` | Health check + service list |
| `/api/system` | CPU, memory, disk, network, uptime |
| `/api/costs` | 30-day LLM cost breakdown |
| `/api/jobs` | Job listings |
| `/api/omad` | OMAD streak + history |
| `/api/projects` | Project update entries |
| `/api/wellbeing` | Mood entries + stats |
| `/api/voice` | Voice note files |
| `/api/voice-transcripts` | Transcripts (supports `?limit=N`) |
| `/api/voice-stats` | Transcript counts |

## Project Structure

```
miniapp/
├── src/
│   ├── components/       # 16 widget/feature components (.tsx)
│   ├── App.tsx            # Main app shell + tabs + auth
│   ├── App.css            # Telegram-themed styles (CSS vars)
│   └── main.tsx           # Entry point
├── api-server.ts          # Backend API server
├── index.html
├── biome.json             # Linter + formatter config
├── tsconfig.json          # Frontend TS config
├── tsconfig.server.json   # Backend TS config
├── vite.config.ts
├── vite-env.d.ts          # Global types (TelegramWebApp, Window)
└── package.json
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3002` | API server port |
| `WORKSPACE_DIR` | `/root/.openclaw/workspace` | Data directory for OMAD, projects, voice, etc. |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |

## Telegram Setup

1. Message [@BotFather](https://t.me/BotFather)
2. Send `/newapp` or go to Bot Settings > Menu Button
3. Set the URL to your deployed app
4. For local testing: `ngrok http 3000`, use the HTTPS URL

## Auth

The app authenticates via Telegram WebApp context or a URL key parameter (`?key=...`). Browser sessions persist via `sessionStorage`.

## Production

```bash
pnpm build
```

Deploy `dist/` to any static host. Run `pnpm server` (or `tsx api-server.ts`) for the backend.

## Keeping the API Server Running

The miniapp widgets fetch real-time data from the API server (`api-server.ts`). If the server stops, widgets fall back to mock data.

### Option 1: Systemd Service (Recommended)

Create a systemd service for auto-start and auto-restart:

```bash
# Create service file
sudo tee /etc/systemd/system/curateur-api.service > /dev/null << 'EOF'
[Unit]
Description=Curateur Miniapp API Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/miniapp
ExecStart=/root/.openclaw/workspace/miniapp/node_modules/.bin/tsx api-server.ts
Restart=always
RestartSec=5
KillMode=process
Environment=HOME=/root
Environment=NODE_ENV=production
Environment=ELEVENLABS_API_KEY=your_api_key_here

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable curateur-api
sudo systemctl start curateur-api

# Check status
systemctl status curateur-api
```

### Service Commands

| Command | Description |
|---------|-------------|
| `systemctl start curateur-api` | Start the API server |
| `systemctl stop curateur-api` | Stop the API server |
| `systemctl restart curateur-api` | Restart the API server |
| `systemctl status curateur-api` | Check server status |
| `journalctl -u curateur-api -f` | View logs |

### Option 2: PM2

```bash
npm install -g pm2
pm2 start "pnpm exec tsx api-server.ts" --name curateur-api
pm2 save
pm2 startup
```

### Option 3: Screen/Tmux (Manual)

```bash
# Using screen
screen -S curateur-api
cd /root/.openclaw/workspace/miniapp && pnpm server
# Detach: Ctrl+A, D

# Reattach
screen -r curateur-api
```

### Data Sources

Real data is stored in these locations (backed up regularly):

| Data | Location |
|------|----------|
| OMAD logs | `~/workspace/MEMORY.md` |
| Wellbeing | `~/workspace/wellbeing/moods.json` |
| Projects | `~/workspace/project-updates/updates.json` |
| Voice notes | `~/workspace/voice-notes/` |
| Transcripts | `~/workspace/voice-transcripts/` |
