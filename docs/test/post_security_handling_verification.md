# Post-Deployment Security Verification

After redeploying, run these checks to verify all security fixes are working.

## 1. Auth middleware

```bash
# Should return 200 (public endpoint)
curl https://your-domain.com/api/health

# Should return 401 (no auth)
curl https://your-domain.com/api/config

# Should return 200 (valid Bearer token)
curl -H "Authorization: Bearer YOUR_SECRET_KEY" https://your-domain.com/api/config
```

## 2. Input validation

```bash
# Should return 404 (unknown skill)
curl -X POST https://your-domain.com/api/skill/fake-skill/execute \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs":{}}'

# Should return 200 (valid skill)
curl -X POST https://your-domain.com/api/skill/new-session/execute \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs":{}}'

# Metacharacters should be stripped
curl -X POST https://your-domain.com/api/message \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"/status; rm -rf /", "chat_id":"YOUR_CHAT_ID"}'
# Response should show "Sent: /status rm -rf /" (semicolon stripped)
```

## 3. MCP persistence

```bash
# List MCP servers
curl -H "Authorization: Bearer YOUR_SECRET_KEY" https://your-domain.com/api/mcp

# Toggle a server off (should write to openclaw.json)
curl -X POST https://your-domain.com/api/mcp/filesystem/config \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# Verify it persisted
cat ~/.openclaw/openclaw.json | grep -A2 filesystem
```

## 4. Frontend (in Telegram or browser)

- **Open via Telegram** — should auto-authenticate, all widgets load
- **Open in browser with `?key=YOUR_SECRET_KEY`** — should unlock and stay authenticated on refresh
- **Open browser console, try `sessionStorage.setItem('miniapp_auth_token', 'true')`** — should NOT bypass auth (hash mismatch)
- **Switch naming packs in Settings** — should persist after page refresh
- **Navigate to a widget that errors** — should show "Something went wrong" with Retry button instead of blank screen

## 5. Run tests on server

```bash
cd /root/.openclaw/workspace/miniapp
pnpm test
```

Should see 30 tests passing across 3 files.
