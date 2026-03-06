import { readFileSync } from 'node:fs'
import https from 'node:https'

function getBotToken(): string {
  try {
    const configPath = '/root/.openclaw/openclaw.json'
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    return config.channels?.telegram?.botToken || ''
  } catch {
    return ''
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || getBotToken()

/** Check whether a bot token is available */
export function hasBotToken(): boolean {
  return TELEGRAM_BOT_TOKEN.length > 0
}

/** Send a message via Telegram Bot API */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; description?: string }> {
  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  })

  return new Promise((resolve) => {
    const req = https.request(
      telegramUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const result = JSON.parse(data)
            resolve({ ok: result.ok, description: result.description })
          } catch {
            resolve({ ok: false, description: 'Failed to parse Telegram response' })
          }
        })
      },
    )
    req.on('error', (err) => {
      resolve({ ok: false, description: err.message })
    })
    req.write(body)
    req.end()
  })
}
