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

### 2. Input validation on `/api/skill/:id/execute`
- **File:** `api/server.ts:66-95`
- **Problem:** User input passed directly to shell execution via Telegram. `skillId` comes from URL param, `inputs` from POST body — neither validated.
- **Fix:** Allowlist skill IDs against the action registry. Sanitize input values (strip shell metacharacters). Reject unknown skill IDs with 404.

### 3. MCP config endpoint doesn't persist
- **File:** `api/server.ts:137-146`
- **Problem:** `POST /api/mcp/:id/config` returns a fake success without writing to `~/.openclaw/openclaw.json`. TapManager toggles are cosmetic only.
- **Fix:** Read openclaw.json (JSON5), toggle the `disabled` flag on the target server, write back. Use `json5` package already in dependencies.

---

## Important

### 4. Add test infrastructure
- **Problem:** Zero test files in the entire project. No regression protection.
- **Fix:** Add Vitest (pairs with Vite). Start with:
  - `api/middleware/auth.test.ts` — validate initData verification, Bearer token, public paths, graceful degradation
  - `src/lib/api.test.ts` — header attachment logic
  - `api/server.test.ts` — key endpoint integration tests (health, config, skill execute)
- **Dependencies:** `vitest`, `@testing-library/react` (for future component tests)

### 5. Silent error swallowing
- **Files:** `src/App.tsx:175`, `src/hooks/useNamingPack.ts:38-40`
- **Problem:** Empty `.catch(() => {})` blocks hide failures from users and developers.
- **Fix:** Log errors to console at minimum. For user-facing operations (command palette agent dispatch), show a toast or inline error.

### 6. Duplicated fetch logic in widgets
- **Files:** `src/plugins/exchange-rate/widget.tsx`, `src/plugins/system-monitor/widget.tsx`, `src/plugins/voice-notes/widget.tsx` (and others)
- **Problem:** Each widget defines a `fetchData()` function AND duplicates the same logic inside `useEffect`. The useEffect body should just call the function.
- **Fix:** Remove duplicated fetch logic from useEffect, call the named function instead.

### 7. sessionStorage auth bypass
- **File:** `src/App.tsx:108`
- **Problem:** Frontend auth check trusts `sessionStorage.getItem('miniapp_auth') === 'true'` which anyone can set via browser console. Backend auth (fix #1) mitigates API access, but the UI is still bypassable.
- **Fix:** Store a signed token or hash in sessionStorage instead of a plain boolean. Validate it against the secret key on load.

### 8. Race condition in naming pack sync
- **File:** `src/hooks/useNamingPack.ts:27-41`
- **Problem:** `setPack` fires a server POST without awaiting the response, then immediately updates local state. If the server write fails, local and server state diverge.
- **Fix:** Use optimistic update pattern — update local immediately but revert if server POST fails. Or await the POST before confirming.

---

## Nice-to-Have

### 9. Hardcoded values
- **File:** `src/plugins/exchange-rate/widget.tsx:13`
- **Problem:** Alert threshold `83` and API URL hardcoded in component.
- **Fix:** Move to plugin manifest or environment config. Could add a `config` field to view manifests for widget-specific settings.

### 10. Loading and error states
- **Problem:** Most widgets show nothing on API failure. No retry mechanism, no error boundaries.
- **Fix:** Create a shared `<WidgetError>` component with retry button. Add React error boundary around lazy-loaded widgets in FacetSelector.

### 11. Inline CSS animations
- **File:** `src/plugins/system-monitor/widget.tsx:193-198`
- **Problem:** CSS `@keyframes` defined as inline styles in component, not reusable.
- **Fix:** Move animation definitions to `App.css`. Already has a `.spinner` class — extend it.

### 12. Telegram types
- **File:** `src/App.tsx:30-41`
- **Problem:** `TelegramWebApp` interface defined inline. Same type info repeated across `App.tsx`, `HookRunner.tsx`, `src/lib/api.ts`.
- **Fix:** Extract to `src/types/telegram.ts`, import everywhere.

---

## Priority Order

| Phase | Items | Effort |
|-------|-------|--------|
| Phase 1 (done) | #1 Auth middleware | ~30 min |
| Phase 2 | #2 Input validation, #3 MCP persistence | ~1 hr |
| Phase 3 | #4 Vitest setup + auth tests | ~1 hr |
| Phase 4 | #5-8 Code quality fixes | ~2 hr |
| Phase 5 | #9-12 Polish | ~2 hr |
