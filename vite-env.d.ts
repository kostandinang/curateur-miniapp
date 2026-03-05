/// <reference types="vite/client" />

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  colorScheme: 'light' | 'dark'
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
  }
  setHeaderColor: (color: string) => void
  showPopup: (params: {
    title?: string
    message: string
    buttons?: Array<{ id: string; text: string; type?: string }>
  }) => void
  showAlert: (message: string) => void
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}
