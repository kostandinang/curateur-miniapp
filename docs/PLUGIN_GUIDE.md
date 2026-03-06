# Plugin Guide

Curateur uses a manifest-driven plugin system. There are three plugin types: **view**, **action**, and **connector**.

## Plugin Types

| Type | Purpose | Has widget? | Has API? |
|------|---------|-------------|----------|
| `view` | Dashboard widget | Yes (`widget.tsx`) | Optional |
| `action` | Sends a command to the bot | No | No |
| `connector` | Toggles an MCP server | No | No |

## Creating a View Plugin

### 1. Create the manifest

```
src/plugins/my-widget/manifest.json
```

```json
{
  "id": "my-widget",
  "type": "view",
  "name": "My Widget",
  "icon": "Star",
  "color": "#f59e0b",
  "description": "Short description",
  "widget": {
    "component": "widget",
    "defaultEnabled": true,
    "refreshInterval": 30000
  },
  "api": {
    "routes": "routes",
    "prefix": "/api/my-widget"
  }
}
```

- `icon` must be a valid [Lucide icon name](https://lucide.dev/icons)
- `defaultEnabled` controls whether it appears on first load
- `api` is optional; omit if the widget is client-only

### 2. Create the widget component

```
src/plugins/my-widget/widget.tsx
```

```tsx
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetchJson } from '../../lib/api'

interface MyData {
  value: string
}

function MyWidget() {
  const [data, setData] = useState<MyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetchJson<MyData>('/api/my-widget')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="empty">
        <Star size={24} className="spinner" />
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <Star size={14} />
        My Widget
      </div>
      <div className="card-value">{data.value}</div>
    </div>
  )
}

export default MyWidget
```

### 3. Create API routes (optional)

```
src/plugins/my-widget/routes.ts
```

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', async (c) => {
  return c.json({ value: 'Hello from my widget' })
})

export default app
```

### 4. Register the plugin

Add to `src/plugins/registry.ts`:

```ts
import myWidget from './my-widget/manifest.json'

// Add to the plugins array:
export const plugins: PluginManifest[] = [
  // ... existing plugins
  myWidget,
] as PluginManifest[]
```

## Creating an Action Plugin

Actions send slash commands to the bot via Telegram.

```json
{
  "id": "my-action",
  "type": "action",
  "name": "My Action",
  "icon": "Zap",
  "color": "#3b82f6",
  "description": "Does something cool",
  "skill": {
    "agent": "default",
    "command": "/my-action",
    "inputs": [
      {
        "name": "target",
        "label": "Target",
        "type": "text",
        "placeholder": "Enter target...",
        "required": true
      }
    ]
  }
}
```

## Creating a Connector Plugin

Connectors toggle MCP servers in OpenClaw config.

```json
{
  "id": "mcp-my-tool",
  "type": "connector",
  "name": "My Tool",
  "icon": "Wrench",
  "color": "#10b981",
  "description": "Connect to My Tool",
  "mcp": {
    "serverName": "my-tool"
  }
}
```

`serverName` must match the key in `~/.openclaw/openclaw.json`.

## Available CSS Classes

Use these in widget components for consistent styling:

- `.card`, `.card-header`, `.card-value`, `.card-sub` — card layout
- `.hero-banner`, `.hero-label`, `.hero-value`, `.hero-sub` — gradient headers
- `.stats-row`, `.stat`, `.stat-value`, `.stat-label` — stats display
- `.icon-box`, `.icon-box.lg`, `.icon-box.sm` — icon containers
- `.progress-track`, `.progress-fill` — progress bars
- `.btn`, `.btn-secondary` — buttons
- `.empty` — empty/loading state wrapper
- `.loader-dots` — dot animation for loading
- `.spinner` — rotating animation for icons

## Schema Types

See `src/plugins/schema.ts` for full TypeScript types:
- `ViewPlugin`, `ActionPlugin`, `ConnectorPlugin`
- `PluginManifest` (union type)
- `SkillInput` (for action inputs)
