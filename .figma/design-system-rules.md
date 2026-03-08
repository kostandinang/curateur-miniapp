# Curateur Miniapp - Design System Rules for Figma Integration

> This document defines how Figma designs should be translated into code for this project.

---

## 1. Token Definitions

### Location
All design tokens are CSS custom properties defined in `src/App.css` (lines 3-12).

### Color Tokens
```css
:root {
  --c-accent: var(--tg-theme-button-color, #3390ec);
  --c-bg: var(--tg-theme-bg-color, #ffffff);
  --c-secondary-bg: var(--tg-theme-secondary-bg-color, #f4f4f5);
  --c-text: var(--tg-theme-text-color, #000000);
  --c-hint: var(--tg-theme-hint-color, #8e8e93);
  --c-link: var(--tg-theme-link-color, #3390ec);
  --c-success: #34c759;
  --c-warning: #ff9500;
}
```

**Important:** Colors fall back to Telegram theme variables (`--tg-theme-*`). Always use the `--c-*` tokens, never hardcode hex values for theme-dependent colors.

### Dynamic Theme Colors
Two additional CSS variables are injected at runtime via naming packs:
- `--c-pack-accent` — Primary accent for the active theme
- `--c-pack-gradient` — Gradient string for hero banners

### Typography
- **Font family:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif`
- **Font sizes:** 11px (micro), 13px (small/labels), 14-15px (body), 16-17px (large body/inputs), 20px (h2), 24px (h3), 32px (display), 48px (xl display)
- **Font weights:** 500 (medium), 600 (semibold), 700 (bold), 800 (extra bold)
- **Line height:** Default browser line height; no custom line-height tokens

### Spacing Scale
Padding/gaps: 4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px, 40px

### Border Radius Scale
4px (small badges) → 8px (buttons) → 10px (inputs) → 12px (cards, standard) → 16px (large cards) → 20px (hero banners)

---

## 2. Component Library

### Location
Components live in three areas:
- `src/shell/` — Shell UI (navigation, settings, command palette)
- `src/plugins/<name>/widget.tsx` — Plugin view widgets
- `src/lib/` — Shared utilities (icons, API, time formatting)

### Key CSS Component Classes (from `src/App.css`)

| Class | Usage |
|-------|-------|
| `.card` | Standard container — secondary bg, 16px padding, 12px border-radius |
| `.hero-banner` | Gradient header section — 24px padding, 20px radius |
| `.btn` | Full-width primary button — accent bg, white text, 12px padding |
| `.btn-secondary` | Outlined button — transparent bg, accent border |
| `.icon-box` | 44px icon container with colored background |
| `.icon-box-lg` | 48px icon container variant |
| `.icon-box-sm` | 36px icon container variant |
| `.icon-box-hero` | 56px hero-sized icon container |
| `.chip` | Toggle/filter pill — small rounded button |
| `.filter-chip` | Variant chip for filter bars |
| `.list-item` | Flex row with left/right content areas |
| `.info-grid` | 2-column metadata grid |
| `.progress-track` / `.progress-fill` | Progress bar components |
| `.status` | Small pill badge (`.success`, `.pending` variants) |
| `.input-group` | Flex container for form inputs with icons |
| `.empty` | Centered empty/loading state |
| `.loader-dots` | Animated 3-dot loading indicator |

### Component Pattern
```tsx
// Standard widget pattern
export function MyWidget() {
  return (
    <div className="card">
      <div className="hero-banner" style={{ background: gradient }}>
        <div className="icon-box-hero">
          <Icon size={24} />
        </div>
        <h3>Title</h3>
      </div>
      <div className="list-item">
        <span>Label</span>
        <span>Value</span>
      </div>
    </div>
  )
}
```

### No Storybook
There is no component documentation system. Reference `src/App.css` and existing widgets for patterns.

---

## 3. Frameworks & Libraries

| Dependency | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI framework |
| TypeScript | 5.3 | Type system |
| Vite | 5.0 | Build tool & dev server |
| Hono | 4.12 | Backend API server |
| lucide-react | 0.300 | Icon library |
| @telegram-apps/sdk-react | 1.0 | Telegram WebApp SDK |
| Biome | 2.4 | Linter/formatter |

**No CSS preprocessors, no Tailwind, no CSS-in-JS, no styled-components.**

---

## 4. Asset Management

- **No image assets** — The app uses only SVG icons via lucide-react
- **No CDN** — All assets are bundled by Vite
- **No static asset directory** — Icons are resolved at runtime from the lucide-react package

---

## 5. Icon System

### Library
**lucide-react** — Icons referenced by PascalCase string name.

### Resolution
```typescript
// src/lib/icons.ts
import * as LucideIcons from 'lucide-react'
import { type LucideIcon, Box } from 'lucide-react'

export function getIcon(iconName: string): LucideIcon {
  return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] || Box
}
```

### Usage in Components
```tsx
import { getIcon } from '../lib/icons'

const Icon = getIcon(manifest.icon)  // e.g., "TrendingUp" → TrendingUp component
<Icon size={14} />
```

### Icon Sizes
- 14px — Inline, small labels
- 16px — Navigation, section headers
- 18px — Medium icons
- 24px — Hero sections
- 32px — List item icons
- 48px — Large display

### Naming Convention
Use PascalCase lucide-react icon names: `TrendingUp`, `Activity`, `Cpu`, `Server`, `Heart`, `Plus`, `Settings`, `FolderOpen`, etc.

---

## 6. Styling Approach

### Methodology
**Vanilla CSS** with CSS custom properties. Single global stylesheet at `src/App.css` (~750 lines).

### Pattern for Applying Styles
1. **CSS classes** for reusable patterns (`.card`, `.btn`, `.chip`, etc.)
2. **Inline styles** for dynamic/computed values (colors from naming packs, conditional backgrounds)
3. **CSS variables** for theming

```tsx
// CSS class + inline style pattern
<div className="card" style={{ borderLeft: `3px solid ${accent}` }}>
  <div className="icon-box" style={{ background: `${color}15` }}>
    <Icon size={18} style={{ color }} />
  </div>
</div>
```

### Global Reset
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
```

### Dark Mode
Handled automatically via Telegram theme CSS variables. No manual dark mode CSS needed. The `--tg-theme-*` variables change based on Telegram's theme.

### Responsive Design
- **Mobile-only** — Telegram Mini App runs in a fixed-width mobile viewport
- **Flexbox** layout throughout
- **No media queries** — Single column, scroll-based layout
- **Hidden scrollbars:** `div::-webkit-scrollbar { display: none }`

---

## 7. Project Structure

```
src/
├── App.tsx              # Main app (auth gate, tab nav, naming pack)
├── App.css              # ALL styles (single file)
├── main.tsx             # React root
├── hooks/               # useNamingPack, useSettings, usePlugin
├── lib/                 # api.ts, icons.ts, mock-data.ts, time-utils.ts
├── plugins/
│   ├── registry.ts      # Central plugin registry
│   ├── schema.ts        # Plugin TypeScript types
│   ├── naming-packs.ts  # 11 theme configurations
│   └── <plugin-name>/   # Each plugin is a directory
│       ├── manifest.json
│       ├── widget.tsx   # View plugins only
│       └── routes.ts    # API routes (optional)
├── shell/               # Shell UI components
│   ├── FacetSelector.tsx
│   ├── HookRunner.tsx
│   ├── Settings.tsx
│   ├── CommandPalette.tsx
│   ├── ConnectorManager.tsx
│   └── WidgetErrorBoundary.tsx
└── types/
    └── telegram.ts
api/
└── server.ts            # Hono backend
```

### Plugin Organization
25 plugins across 3 tiers:
- **View (12)** — Dashboard widgets with `widget.tsx`
- **Action (5)** — Agent skills with `skill.agent` field
- **Connector (8)** — MCP server configs with `mcp.configSchema`

---

## 8. Animations

```css
/* Available keyframe animations */
@keyframes spin    { to { transform: rotate(360deg) } }           /* 1s linear */
@keyframes pulse   { 0%,100% { transform: scale(1); opacity: 1 }
                     50% { transform: scale(1.05); opacity: 0.8 } } /* 1.2s */
@keyframes loader-fade { 0%,100% { opacity: 0.3 } 50% { opacity: 1 } } /* 1.2s staggered */
@keyframes slideIn { from { opacity: 0; transform: translateY(-4px) }
                     to { opacity: 1; transform: translateY(0) } }    /* 0.15s */
```

Standard transition: `transition: transform 0.15s, opacity 0.15s` on interactive elements.

---

## 9. Naming Packs (Themes)

11 theme packs are defined in `src/plugins/naming-packs.ts`. Each provides:
- `accent` — Primary color hex
- `gradient` — CSS gradient string for hero banners
- Custom display names for plugin tiers

When translating Figma designs, use `var(--c-pack-accent)` for theme-aware accent colors.

**Example pack gradients:**
- Default: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Cyberpunk: `linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #9f1239 100%)`
- Arcane: `linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)`

---

## 10. Rules for Figma-to-Code Translation

1. **Always use CSS custom properties** (`--c-accent`, `--c-bg`, etc.) instead of hardcoded colors
2. **Use existing CSS classes** (`.card`, `.btn`, `.icon-box`, etc.) before creating new styles
3. **Add new styles to `src/App.css`** — do not create separate CSS files
4. **Use lucide-react icons** via `getIcon()` — do not import SVG files
5. **Use inline styles** only for dynamic/computed values (theme colors, conditional states)
6. **No CSS modules, no Tailwind, no CSS-in-JS** — vanilla CSS only
7. **Mobile-first single column** — no responsive breakpoints needed
8. **12px border-radius** is the standard for cards; 8px for buttons/inputs
9. **System fonts only** — no custom font imports
10. **Telegram dark mode** is automatic — never hardcode light/dark specific colors
11. **Plugin widgets** go in `src/plugins/<name>/widget.tsx` as default exports
12. **All new CSS** should use the existing spacing scale (4/8/12/16/20/24px)
