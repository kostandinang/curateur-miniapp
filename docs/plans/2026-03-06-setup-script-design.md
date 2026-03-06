# Setup Script Design

**Date:** 2026-03-06
**Status:** Approved

## Overview

Two-entry-point setup system: CLI script (`pnpm setup`) for initial server configuration, and in-app settings for UI preferences. Both read/write a shared `curateur.config.json` for app preferences. Server secrets go in `.env`.

## CLI Setup (`pnpm setup`)

Interactive terminal wizard using Node.js readline. Steps:

### Step 1: Environment Variables
- `WORKSPACE_DIR` (default: `/root/.openclaw/workspace`)
- `OPENCLAW_CONFIG_PATH` (default: `~/.openclaw/openclaw.json`)
- `TELEGRAM_BOT_TOKEN` (or auto-detect from OpenClaw config)
- `CORS_ORIGIN` (default: `*`)
- `PORT` (default: `3002`)
- `VITE_SECRET_KEY` (for browser auth fallback)
- Writes to `.env`

### Step 2: Validate OpenClaw
- Check if openclaw binary exists at `/usr/bin/openclaw`
- Try `openclaw --version`
- Check if config file exists at `OPENCLAW_CONFIG_PATH`
- Report status (installed/not found/version)

### Step 3: Naming Pack
- Show all 11 themes with preview (e.g. "Sci-Fi: Scanners | Protocols | Relays")
- User picks a number 0-10
- Writes to `curateur.config.json`

### Step 4: Plugin Selection
- Show all 12 views, user toggles on/off (all on by default)
- Show all 5 actions, user toggles on/off
- Show all 8 connectors, user toggles on/off
- Writes to `curateur.config.json`

### Step 5: Summary
- Print what was configured
- Show next steps ("Run `pnpm dev` to start")

## In-App Settings

A "Setup" section within the existing Settings shell component:
- Naming pack picker (cards showing all 11 themes)
- Plugin enable/disable toggles (reads/writes via `/api/config`)
- No env var editing from the app (security)

## Config Files

### `.env` (server-side, gitignored)
```
WORKSPACE_DIR=/root/.openclaw/workspace
OPENCLAW_CONFIG_PATH=/root/.openclaw/openclaw.json
TELEGRAM_BOT_TOKEN=...
CORS_ORIGIN=*
PORT=3002
VITE_SECRET_KEY=...
```

### `curateur.config.json` (app preferences, committed)
```json
{
  "namingPack": 0,
  "plugins": {
    "views": ["exchange-rate", "system-monitor", "omad-tracker", ...],
    "actions": ["new-session", "reset-session", ...],
    "connectors": ["mcp-filesystem", "mcp-fetch", ...]
  }
}
```

## Integration

- Backend: `api/server.ts` reads `curateur.config.json` at startup, serves via `GET /api/config`, accepts `POST /api/config` for updates
- Frontend: `useSettings` and `useNamingPack` hooks fetch `/api/config` first, fall back to localStorage
- Existing localStorage behavior preserved as per-browser override layer
