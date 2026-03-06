# Curateur Improvement Roadmap

**Date:** 2026-03-06
**Status:** In Progress

---

## Critical

### 1. Auth middleware (DONE)
- **Files:** `api/middleware/auth.ts`, `src/lib/api.ts`, all widget/shell/hook files
- **Problem:** Auth middleware was a pass-through, all API endpoints unprotected
- **Fix:** Telegram initData HMAC-SHA256 validation + Bearer token fallback. Created `apiFetch` wrapper used by all frontend API calls.
- **Commit:** Pending

### 2. Input validation on `/api/skill/:id/execute` (DONE)
- **Files:** `api/server.ts`
- **Problem:** User input passed directly to shell execution via Telegram. `skillId` comes from URL param, `inputs` from POST body — neither validated.
- **Fix:** Allowlist skill IDs against the action registry. `sanitizeInput()` strips shell metacharacters and limits length. `/api/message` also validated and sanitized.

### 3. MCP config endpoint doesn't persist (DONE)
- **Files:** `api/server.ts`
- **Problem:** `POST /api/mcp/:id/config` returned fake success without writing to `~/.openclaw/openclaw.json`. TapManager toggles were cosmetic only.
- **Fix:** Reads openclaw.json via JSON5, toggles `disabled` flag on target server, writes back. Validates server exists in config before modifying.

---

## Important

### 4. Add test infrastructure (DONE)
- **Problem:** Zero test files in the entire project. No regression protection.
- **Fix:** Added Vitest. 30 tests across 3 files:
  - `api/middleware/auth.test.ts` (9 tests) — initData HMAC validation, Bearer token, public paths, graceful degradation, priority
  - `api/lib/sanitize.test.ts` (17 tests) — metacharacter stripping, length limits, attack strings, URL preservation
  - `api/lib/skill-loader.test.ts` (4 tests) — dynamic manifest loading, type filtering, missing directory
- Extracted `sanitizeInput` to `api/lib/sanitize.ts` and `loadAllowedSkillIds` to `api/lib/skill-loader.ts` for testability

### 5. Silent error swallowing (DONE)
- **Files:** `src/App.tsx`, `src/hooks/useNamingPack.ts`
- **Problem:** Empty `.catch(() => {})` blocks hid failures.
- **Fix:** Added `console.error` with descriptive messages in App.tsx and useNamingPack.ts.

### 6. Duplicated fetch logic in widgets (DONE)
- **Files:** 9 widget files under `src/plugins/`
- **Problem:** Each widget duplicated fetch logic inside useEffect instead of calling the named function.
- **Fix:** Replaced all `doFetch` bodies with calls to the existing named function (fetchRate, fetchStats, fetchNotes, etc.).

### 7. sessionStorage auth bypass (DONE)
- **File:** `src/App.tsx`
- **Problem:** Frontend stored `miniapp_auth=true` in sessionStorage — trivially spoofable.
- **Fix:** Now stores SHA-256 hash of secret key + salt. On load, re-hashes the key and compares. Also removed URL redirect on unlock (no longer leaks key in URL).

### 8. Race condition in naming pack sync (DONE)
- **File:** `src/hooks/useNamingPack.ts`
- **Problem:** `setPack` fired server POST without awaiting, causing potential state divergence on failure.
- **Fix:** Optimistic update with revert — updates UI immediately, saves previous state, reverts both React state and localStorage if server POST fails.

---

## Nice-to-Have

### 9. Hardcoded values (DONE)
- **File:** `src/plugins/exchange-rate/widget.tsx`
- **Fix:** Extracted `EXCHANGE_API_URL`, `DEFAULT_THRESHOLD`, `REFRESH_INTERVAL_MS` as named constants.

### 10. Loading and error states (DONE)
- **Files:** `src/shell/WidgetErrorBoundary.tsx`, `src/shell/FacetSelector.tsx`
- **Fix:** Created `WidgetErrorBoundary` with retry button. Wraps all lazy-loaded widgets in FacetSelector.

### 11. Inline CSS animations (DONE)
- **Files:** `src/App.css`, `src/plugins/system-monitor/widget.tsx`
- **Fix:** Moved `@keyframes pulse` from inline `<style>` tag to `App.css`. Removed the inline block.

### 12. Telegram types (DONE)
- **Files:** `src/types/telegram.ts`, `src/App.tsx`, `src/lib/api.ts`, `src/shell/HookRunner.tsx`
- **Fix:** Extracted `TelegramWebApp` and `TelegramWindow` to shared types file. Removed inline definitions from 3 files.

---

## Priority Order

| Phase | Items | Effort |
|-------|-------|--------|
| Phase 1 (done) | #1 Auth middleware | ~30 min |
| Phase 2 (done) | #2 Input validation, #3 MCP persistence | ~1 hr |
| Phase 3 (done) | #4 Vitest setup + 30 tests | ~1 hr |
| Phase 4 (done) | #5-8 Code quality fixes | ~2 hr |
| Phase 5 (done) | #9-12 Polish | ~2 hr |
