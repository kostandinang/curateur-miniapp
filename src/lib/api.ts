/**
 * Authenticated fetch wrapper for all API calls.
 * Attaches Telegram initData or Bearer token as auth header.
 */

interface TelegramWebApp {
  initData?: string
}

function getAuthHeaders(): Record<string, string> {
  // Prefer Telegram initData if available
  const tg = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
  if (tg?.initData) {
    return { 'X-Telegram-Init-Data': tg.initData }
  }

  // Fall back to secret key from env (for browser access)
  const secretKey = import.meta.env.VITE_SECRET_KEY as string | undefined
  if (secretKey) {
    return { Authorization: `Bearer ${secretKey}` }
  }

  return {}
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const authHeaders = getAuthHeaders()
  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers || {}),
    },
  }
  return fetch(input, mergedInit)
}
