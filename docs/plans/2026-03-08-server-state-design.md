# Unified Server State Management

**Date:** 2026-03-08
**Status:** Approved
**Problem:** State stored in three places (registry defaults, server config, localStorage) with unclear precedence and race conditions on rapid mutations.

## Design

### `useServerState<T>(key, defaultValue, options?)` Hook

**Contract:**
```ts
interface UseServerStateOptions<T> {
  onError?: (err: Error) => void;
}

interface UseServerStateReturn<T> {
  value: T;
  set: (v: T) => Promise<void>;
  loading: boolean;
  syncing: boolean;
}
```

- `key` maps to a path in server config (e.g. `"plugins"`, `"namingPack"`)
- Returns cached value immediately from `sessionStorage`, then reconciles with server (server wins)
- `set()` queued per-key — no parallel POSTs for the same key
- Optimistic UI with automatic rollback on failure

### Precedence Model

Single rule: **server config is truth, everything else is cache.**

**On mount:**
1. Read `sessionStorage` → render immediately
2. GET `/api/config` → if different, update state + cache (server wins silently)
3. If server unreachable: keep cached value, log warning

**On mutation:**
1. Optimistic update to state + `sessionStorage`
2. POST `/api/config`
3. Success: no-op
4. Failure: rollback state + cache, call `onError`

### Mutation Queue

Per-key queue stored in a ref:
```
Map<string, { pending: Promise<void>, latestValue: T }>
```

**Collapse behavior:** Rapid mutations produce at most 2 POSTs (current + final). If key already has a pending mutation, `latestValue` is updated instead of queuing another POST. When current POST completes, fires one more with the final value if it changed.

**Rollback:** Each `set()` captures pre-mutation value. On failure, restores that snapshot. Collapsed mutations roll back to the value before the entire sequence started.

**Keys are independent** — toggling a plugin while switching naming pack works in parallel.

### Cache Strategy

`sessionStorage` (not `localStorage`):
- Clears on tab close — no stale cross-session state
- Write-through: updated on every successful server response

### Error Handling

- `onError` callback (optional) — default: `console.warn` + rollback
- No silent `.catch(() => {})` anywhere
- No retry loop — next `set()` or remount retries naturally
- No toast system added (separate concern, can plug into `onError` later)

### Consumer Migration

**Settings/FacetSelector:**
```tsx
const { value: plugins, set: setPlugins, syncing } = useServerState("plugins", defaultPluginConfig);
```
- `syncing` drives subtle UI indicator on toggles
- No more separate `syncToServer()` calls

**Naming pack:**
```tsx
const { value: packId, set: setPackId } = useServerState("namingPack", "default");
const pack = NAMING_PACKS[packId]; // derived, not stored
```

### Files Changed

- **Delete:** `src/hooks/useSettings.ts`, `src/hooks/useNamingPack.ts`
- **Create:** `src/hooks/useServerState.ts`
- **Edit:** `src/shell/Settings.tsx`, `src/shell/FacetSelector.tsx`, `src/App.tsx`, any component importing old hooks

### What Stays Unchanged

- `usePlugin` hook (per-widget API fetching)
- Plugin widgets (don't touch config state)
- `ConnectorManager` (reads/writes `/api/mcp`, not `/api/config`)
- Backend `/api/config` endpoint (same GET/POST contract)
- No new dependencies
