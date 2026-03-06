import { createHmac } from 'node:crypto'
import type { MiddlewareHandler } from 'hono'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const SECRET_KEY = process.env.VITE_SECRET_KEY || ''

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  let result = 0
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i]
  }
  return result === 0
}

function validateTelegramInitData(initData: string): boolean {
  if (!initData || !BOT_TOKEN) return false

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false

  params.delete('hash')
  const entries = Array.from(params.entries())
  entries.sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const computedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  return timingSafeEqual(computedHash, hash)
}

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/api/health']

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Skip auth for public endpoints
  if (PUBLIC_PATHS.includes(c.req.path)) {
    await next()
    return
  }

  // 1. Check Telegram initData header
  const initData = c.req.header('X-Telegram-Init-Data')
  if (initData && validateTelegramInitData(initData)) {
    await next()
    return
  }

  // 2. Check Bearer token (browser fallback)
  const authHeader = c.req.header('Authorization')
  if (authHeader && SECRET_KEY) {
    const token = authHeader.replace('Bearer ', '')
    if (timingSafeEqual(token, SECRET_KEY)) {
      await next()
      return
    }
  }

  // 3. If no auth methods configured (no bot token AND no secret key), allow through
  //    This preserves backward compat for users who haven't run setup yet
  if (!BOT_TOKEN && !SECRET_KEY) {
    await next()
    return
  }

  return c.json({ error: 'Unauthorized' }, 401)
}
