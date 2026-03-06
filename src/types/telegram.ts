export interface TelegramWebApp {
  ready: () => void
  expand: () => void
  initData?: string
  setHeaderColor?: (color: string) => void
  colorScheme?: 'dark' | 'light'
  showPopup?: (params: {
    title: string
    message: string
    buttons: { id: string; text: string }[]
  }) => void
  initDataUnsafe?: { chat?: { id: number }; user?: { id: number } }
}

export interface TelegramWindow {
  Telegram?: { WebApp?: TelegramWebApp }
}
