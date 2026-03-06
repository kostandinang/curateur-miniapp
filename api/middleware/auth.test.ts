import { createHmac } from 'node:crypto'
import { Hono } from 'hono'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/** Generate valid Telegram initData for testing */
function makeInitData(botToken: string, fields: Record<string, string> = {}): string {
  const defaults = { auth_date: String(Math.floor(Date.now() / 1000)), user: '{"id":123}' }
  const merged = { ...defaults, ...fields }

  const entries = Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  const params = new URLSearchParams(merged)
  params.set('hash', hash)
  return params.toString()
}

async function loadMiddleware() {
  const mod = await import('./auth')
  return mod.authMiddleware
}

function createApp(middleware: Parameters<Hono['use']>[1]) {
  const app = new Hono()
  app.use('*', middleware)
  app.get('/api/health', (c) => c.json({ status: 'ok' }))
  app.get('/api/config', (c) => c.json({ data: 'protected' }))
  app.post('/api/skill/test/execute', (c) => c.json({ ran: true }))
  return app
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.VITE_SECRET_KEY
  })

  describe('public paths', () => {
    it('allows /api/health without auth', async () => {
      process.env.VITE_SECRET_KEY = 'secret123'
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const res = await app.request('/api/health')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ status: 'ok' })
    })
  })

  describe('no auth configured', () => {
    it('allows all requests when no bot token and no secret key', async () => {
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const res = await app.request('/api/config')
      expect(res.status).toBe(200)
    })
  })

  describe('Bearer token', () => {
    it('allows valid Bearer token', async () => {
      process.env.VITE_SECRET_KEY = 'my-secret'
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const res = await app.request('/api/config', {
        headers: { Authorization: 'Bearer my-secret' },
      })
      expect(res.status).toBe(200)
    })

    it('rejects invalid Bearer token', async () => {
      process.env.VITE_SECRET_KEY = 'my-secret'
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const res = await app.request('/api/config', {
        headers: { Authorization: 'Bearer wrong' },
      })
      expect(res.status).toBe(401)
    })

    it('rejects request with no auth header when secret is configured', async () => {
      process.env.VITE_SECRET_KEY = 'my-secret'
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const res = await app.request('/api/config')
      expect(res.status).toBe(401)
    })
  })

  describe('Telegram initData', () => {
    const BOT_TOKEN = '123456:ABC-DEF'

    it('allows valid initData', async () => {
      process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const initData = makeInitData(BOT_TOKEN)
      const res = await app.request('/api/config', {
        headers: { 'X-Telegram-Init-Data': initData },
      })
      expect(res.status).toBe(200)
    })

    it('rejects tampered initData', async () => {
      process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const initData = makeInitData(BOT_TOKEN) + '&extra=tampered'
      const res = await app.request('/api/config', {
        headers: { 'X-Telegram-Init-Data': initData },
      })
      expect(res.status).toBe(401)
    })

    it('rejects initData signed with wrong token', async () => {
      process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const initData = makeInitData('wrong-token')
      const res = await app.request('/api/config', {
        headers: { 'X-Telegram-Init-Data': initData },
      })
      expect(res.status).toBe(401)
    })
  })

  describe('priority', () => {
    it('accepts initData even when Bearer is also configured', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.VITE_SECRET_KEY = 'my-secret'
      const middleware = await loadMiddleware()
      const app = createApp(middleware)

      const initData = makeInitData('123456:ABC-DEF')
      const res = await app.request('/api/config', {
        headers: { 'X-Telegram-Init-Data': initData },
      })
      expect(res.status).toBe(200)
    })
  })
})
