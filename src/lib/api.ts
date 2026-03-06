/**
 * Authenticated fetch wrapper for all API calls.
 * Attaches Telegram initData or Bearer token as auth header.
 */
import type { TelegramWindow } from '../types/telegram'

function getAuthHeaders(): Record<string, string> {
  const tg = (window as unknown as TelegramWindow).Telegram?.WebApp
  if (tg?.initData) {
    return { 'X-Telegram-Init-Data': tg.initData }
  }

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
