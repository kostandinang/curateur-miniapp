# Unified Server State Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `useSettings` and `useNamingPack` with a single `useServerState` hook that treats the server as the sole source of truth, caches in `sessionStorage`, and serializes mutations per-key to eliminate race conditions.

**Architecture:** A generic hook `useServerState<T>(key, defaultValue)` reads/writes a top-level key on `/api/config`. It returns the value immediately from `sessionStorage` cache, reconciles with the server on mount, and queues mutations per-key so rapid calls collapse into at most 2 POSTs. Consumers migrate from the old hooks to this one.

**Tech Stack:** React 18 hooks, TypeScript, vitest for unit tests

**Design doc:** `docs/plans/2026-03-08-server-state-design.md`

---

### Task 1: Write `useServerState` hook with tests

**Files:**
- Create: `src/hooks/useServerState.ts`
- Create: `src/hooks/useServerState.test.ts`

**Step 1: Write the test file**

```ts
// src/hooks/useServerState.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We test the core logic functions directly (not the React hook),
// since we don't have @testing-library/react set up.

import {
  readCache,
  writeCache,
  buildConfigPatch,
  CACHE_PREFIX,
} from './useServerState'

describe('readCache', () => {
  beforeEach(() => sessionStorage.clear())

  it('returns defaultValue when cache is empty', () => {
    expect(readCache('plugins', [])).toEqual([])
  })

  it('returns cached value when present', () => {
    sessionStorage.setItem(`${CACHE_PREFIX}plugins`, JSON.stringify(['a', 'b']))
    expect(readCache('plugins', [])).toEqual(['a', 'b'])
  })

  it('returns defaultValue on corrupt JSON', () => {
    sessionStorage.setItem(`${CACHE_PREFIX}plugins`, '{bad')
    expect(readCache('plugins', 'fallback')).toBe('fallback')
  })
})

describe('writeCache', () => {
  beforeEach(() => sessionStorage.clear())

  it('writes serialized value', () => {
    writeCache('namingPack', 3)
    expect(sessionStorage.getItem(`${CACHE_PREFIX}namingPack`)).toBe('3')
  })
})

describe('buildConfigPatch', () => {
  it('merges key into existing config', () => {
    const existing = { namingPack: 0, plugins: { views: [] } }
    const result = buildConfigPatch(existing, 'namingPack', 5)
    expect(result).toEqual({ namingPack: 5, plugins: { views: [] } })
  })

  it('does not mutate the original config', () => {
    const existing = { namingPack: 0 }
    buildConfigPatch(existing, 'namingPack', 5)
    expect(existing.namingPack).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/hooks/useServerState.test.ts`
Expected: FAIL — module not found

**Step 3: Write the hook implementation**

```ts
// src/hooks/useServerState.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'

// --- Exported helpers (testable without React) ---

export const CACHE_PREFIX = 'curateur-state:'

export function readCache<T>(key: string, defaultValue: T): T {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`)
    return raw !== null ? (JSON.parse(raw) as T) : defaultValue
  } catch {
    return defaultValue
  }
}

export function writeCache<T>(key: string, value: T): void {
  sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value))
}

export function buildConfigPatch<T>(
  existingConfig: Record<string, unknown>,
  key: string,
  value: T,
): Record<string, unknown> {
  return { ...existingConfig, [key]: value }
}

// --- Mutation queue (module-level, shared across hook instances) ---

interface QueueEntry<T> {
  pending: Promise<void>
  latestValue: T
  hasNext: boolean
}

const mutationQueues = new Map<string, QueueEntry<unknown>>()

async function postConfig(key: string, value: unknown): Promise<void> {
  const res = await apiFetch('/api/config')
  const config = await res.json()
  await apiFetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildConfigPatch(config, key, value)),
  })
}

// --- Hook options ---

export interface UseServerStateOptions {
  onError?: (err: Error) => void
}

export interface UseServerStateReturn<T> {
  value: T
  set: (v: T) => Promise<void>
  loading: boolean
  syncing: boolean
}

// --- The hook ---

export function useServerState<T>(
  key: string,
  defaultValue: T,
  options?: UseServerStateOptions,
): UseServerStateReturn<T> {
  const [value, setValue] = useState<T>(() => readCache(key, defaultValue))
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Ref to track the pre-sequence value for rollback on collapsed mutations
  const preSequenceRef = useRef<T>(value)

  const handleError = options?.onError ?? ((err: Error) => console.warn(`[useServerState:${key}]`, err.message))

  // Mount: reconcile with server
  useEffect(() => {
    let cancelled = false
    apiFetch('/api/config')
      .then(r => r.json())
      .then(config => {
        if (cancelled) return
        const serverValue = config[key]
        if (serverValue !== undefined) {
          setValue(serverValue as T)
          writeCache(key, serverValue)
        }
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.warn(`[useServerState:${key}] Server fetch failed, using cache:`, err.message)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [key])

  // Mutation with per-key queue and collapse
  const set = useCallback(
    async (newValue: T): Promise<void> => {
      // Optimistic update
      const previousValue = value
      setValue(newValue)
      writeCache(key, newValue)

      const existing = mutationQueues.get(key) as QueueEntry<T> | undefined

      if (existing?.pending) {
        // Collapse: don't fire another POST, just update latestValue
        existing.latestValue = newValue
        existing.hasNext = true
        // Wait for the full sequence to finish
        return existing.pending
      }

      // Capture pre-sequence value for rollback
      preSequenceRef.current = previousValue
      setSyncing(true)

      const execute = async (val: T): Promise<void> => {
        try {
          await postConfig(key, val)
        } catch (err) {
          // Rollback to pre-sequence value
          const rollbackValue = preSequenceRef.current
          setValue(rollbackValue)
          writeCache(key, rollbackValue)
          handleError(err instanceof Error ? err : new Error(String(err)))
          return
        }

        // Check if a collapsed value is waiting
        const entry = mutationQueues.get(key) as QueueEntry<T> | undefined
        if (entry?.hasNext) {
          const nextValue = entry.latestValue
          entry.hasNext = false
          await execute(nextValue)
        }
      }

      const pending = execute(newValue).finally(() => {
        mutationQueues.delete(key)
        setSyncing(false)
      })

      mutationQueues.set(key, { pending, latestValue: newValue, hasNext: false })
      return pending
    },
    [key, value, handleError],
  )

  return { value, set, loading, syncing }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test src/hooks/useServerState.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/hooks/useServerState.ts src/hooks/useServerState.test.ts
git commit -m "feat: add useServerState hook with per-key mutation queue"
```

---

### Task 2: Migrate `FacetSelector` and `Settings` from `useSettings`

**Files:**
- Modify: `src/shell/FacetSelector.tsx` (lines 3-4, 26-27, 38)
- Modify: `src/shell/Settings.tsx` (line 6 — no hook import changes, just props)

**Context:** `useSettings` is only imported in `FacetSelector.tsx`. Settings.tsx receives everything via props — no hook changes needed there.

**Step 1: Update FacetSelector imports and hook usage**

In `src/shell/FacetSelector.tsx`, replace:
```ts
import { useNamingPack } from '../hooks/useNamingPack'
import { useSettings } from '../hooks/useSettings'
```
with:
```ts
import { useServerState } from '../hooks/useServerState'
import { getNamingPack } from '../plugins/naming-packs'
```

Replace:
```ts
  const { enabledPlugins, loaded, toggle, reset, isEnabled } = useSettings()
  const { pack, setPack } = useNamingPack()
```
with:
```ts
  const defaultViews = views.filter(v => v.widget.defaultEnabled).map(v => v.id)
  const { value: enabledPlugins, set: setEnabledPlugins, loading } = useServerState<string[]>('plugins.views', defaultViews)
  const { value: packId, set: setPackId } = useServerState<number>('namingPack', 0)
  const pack = getNamingPack(packId)

  const loaded = !loading
  const isEnabled = (id: string) => enabledPlugins.includes(id)
  const toggle = (id: string) => {
    const next = enabledPlugins.includes(id)
      ? enabledPlugins.filter(p => p !== id)
      : [...enabledPlugins, id]
    setEnabledPlugins(next)
  }
  const reset = () => setEnabledPlugins(defaultViews)
  const setPack = (id: number) => setPackId(id)
```

**Important:** This requires a change to the hook — the current server config stores `plugins.views` as a nested path (`config.plugins.views`), but `useServerState` writes to a top-level key. We need to handle this.

**Step 2: Update `useServerState` to support nested keys**

In `src/hooks/useServerState.ts`, update `buildConfigPatch` and the mount read:

Replace `buildConfigPatch`:
```ts
export function buildConfigPatch<T>(
  existingConfig: Record<string, unknown>,
  key: string,
  value: T,
): Record<string, unknown> {
  return { ...existingConfig, [key]: value }
}
```
with:
```ts
export function readNestedKey(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function buildConfigPatch<T>(
  existingConfig: Record<string, unknown>,
  key: string,
  value: T,
): Record<string, unknown> {
  const parts = key.split('.')
  if (parts.length === 1) {
    return { ...existingConfig, [key]: value }
  }

  const result = { ...existingConfig }
  let current: Record<string, unknown> = result
  for (let i = 0; i < parts.length - 1; i++) {
    const nested = current[parts[i]]
    const copy = typeof nested === 'object' && nested !== null
      ? { ...(nested as Record<string, unknown>) }
      : {}
    current[parts[i]] = copy
    current = copy
  }
  current[parts[parts.length - 1]] = value
  return result
}
```

Also update the mount effect to use `readNestedKey`:
```ts
const serverValue = readNestedKey(config, key)
```

And update the test file to add tests for nested keys:
```ts
describe('readNestedKey', () => {
  it('reads top-level key', () => {
    expect(readNestedKey({ a: 1 }, 'a')).toBe(1)
  })

  it('reads nested key', () => {
    expect(readNestedKey({ plugins: { views: ['a'] } }, 'plugins.views')).toEqual(['a'])
  })

  it('returns undefined for missing path', () => {
    expect(readNestedKey({}, 'a.b.c')).toBeUndefined()
  })
})

describe('buildConfigPatch (nested)', () => {
  it('patches nested key without mutating', () => {
    const existing = { namingPack: 0, plugins: { views: ['a'], actions: [] } }
    const result = buildConfigPatch(existing, 'plugins.views', ['a', 'b'])
    expect(result).toEqual({ namingPack: 0, plugins: { views: ['a', 'b'], actions: [] } })
    expect(existing.plugins.views).toEqual(['a']) // original untouched
  })
})
```

**Step 3: Run tests**

Run: `pnpm test src/hooks/useServerState.test.ts`
Expected: All tests PASS

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add src/hooks/useServerState.ts src/hooks/useServerState.test.ts src/shell/FacetSelector.tsx
git commit -m "feat: migrate FacetSelector from useSettings to useServerState"
```

---

### Task 3: Migrate `useNamingPack` consumers

**Files:**
- Modify: `src/App.tsx` (line 4, 70)
- Modify: `src/shell/HookRunner.tsx` (line 5, 23)
- Modify: `src/shell/ConnectorManager.tsx` (line 5, 86)
- Modify: `src/shell/CommandPalette.tsx` (line 4, 80)

**Context:** These files all do `const { pack } = useNamingPack()` — read-only. They need to switch to `useServerState('namingPack', 0)` + `getNamingPack(packId)`.

**Step 1: Update App.tsx**

Replace:
```ts
import { useNamingPack } from './hooks/useNamingPack'
```
with:
```ts
import { useServerState } from './hooks/useServerState'
import { getNamingPack } from './plugins/naming-packs'
```

Replace:
```ts
  const { pack } = useNamingPack()
```
with:
```ts
  const { value: packId } = useServerState<number>('namingPack', 0)
  const pack = getNamingPack(packId)
```

**Step 2: Update HookRunner.tsx**

Replace:
```ts
import { useNamingPack } from '../hooks/useNamingPack'
```
with:
```ts
import { useServerState } from '../hooks/useServerState'
import { getNamingPack } from '../plugins/naming-packs'
```

Replace:
```ts
  const { pack } = useNamingPack()
```
with:
```ts
  const { value: packId } = useServerState<number>('namingPack', 0)
  const pack = getNamingPack(packId)
```

**Step 3: Update ConnectorManager.tsx**

Same pattern — replace `useNamingPack` import and usage with `useServerState` + `getNamingPack`.

**Step 4: Update CommandPalette.tsx**

Same pattern.

**Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 6: Commit**

```bash
git add src/App.tsx src/shell/HookRunner.tsx src/shell/ConnectorManager.tsx src/shell/CommandPalette.tsx
git commit -m "feat: migrate all useNamingPack consumers to useServerState"
```

---

### Task 4: Delete old hooks and clean up localStorage references

**Files:**
- Delete: `src/hooks/useSettings.ts`
- Delete: `src/hooks/useNamingPack.ts`

**Step 1: Delete old hooks**

```bash
rm src/hooks/useSettings.ts src/hooks/useNamingPack.ts
```

**Step 2: Search for any remaining imports**

Run: `grep -r "useSettings\|useNamingPack" src/`
Expected: No results

**Step 3: Search for localStorage references related to old keys**

Run: `grep -r "curateur-widgets-enabled\|curateur-naming-pack" src/`
Expected: No results

**Step 4: Run typecheck + tests**

Run: `pnpm typecheck && pnpm test`
Expected: All pass, no import errors

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove useSettings and useNamingPack (replaced by useServerState)"
```

---

### Task 5: Manual smoke test

**No files changed — verification only.**

**Step 1: Start dev server**

Run: `pnpm dev` (in one terminal) and `pnpm server` (in another)

**Step 2: Test widget toggle**

1. Open app in browser
2. Go to Configure → toggle a widget off
3. Refresh the page → widget should still be off (server persisted)
4. Open a new tab → same state (sessionStorage won't have it, but server fetch does)

**Step 3: Test naming pack**

1. Switch naming pack to "Cyberpunk"
2. Refresh → should still be Cyberpunk
3. Rapidly click through 5 packs quickly → final one should stick, no console errors

**Step 4: Test offline resilience**

1. Open DevTools → Network → Offline
2. Toggle a widget → should update UI optimistically
3. Go back online → next action syncs correctly

**Step 5: Commit** (nothing to commit — this is verification only)
