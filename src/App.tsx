import { Activity, Command, LayoutGrid, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import CommandPalette from './components/CommandPalette'
import SessionStatus from './components/SessionStatus'
import SkillsRunner from './components/SkillsRunner'
import Widgets from './components/Widgets'
import './App.css'

const SECRET_KEY = '090909'

type TabType = 'widgets' | 'status' | 'tools'

interface CommandAction {
  name: string
  action: string
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  colorScheme?: 'dark' | 'light'
  showPopup?: (params: {
    title: string
    message: string
    buttons: { id: string; text: string }[]
  }) => void
  initDataUnsafe?: { chat?: { id: number }; user?: { id: number } }
}

interface CurateurLogoProps {
  size?: number
}

// Curateur Logo Component - Creative "C" design
function CurateurLogo({ size = 36 }: CurateurLogoProps) {
  return (
    <div 
      className="logo" 
      style={{ 
        width: size, 
        height: size, 
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Stylized C that looks like a claw/pincer */}
        <path d="M19 5c-3-3-8-3-11 0s-3 8 0 11 8 3 11 0" />
        <circle cx="8" cy="12" r="2" fill="white" stroke="none" />
      </svg>
    </div>
  )
}

function App() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('widgets')
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false)
  const [activeWidget, setActiveWidget] = useState<string>('rates')

  useEffect(() => {
    setIsLoading(true)

    const webapp = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
      ?.WebApp
    if (webapp) {
      webapp.ready()
      webapp.expand()
      setTg(webapp)
      setIsAuthorized(true)
      webapp.setHeaderColor?.(webapp.colorScheme === 'dark' ? '#000000' : '#ffffff')
      setIsLoading(false)
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const key = urlParams.get('key')
    if (key === SECRET_KEY || sessionStorage.getItem('miniapp_auth') === 'true') {
      setIsAuthorized(true)
      if (key === SECRET_KEY) sessionStorage.setItem('miniapp_auth', 'true')
      setIsLoading(false)
      return
    }

    setIsAuthorized(false)
    setIsLoading(false)
  }, [])

  // Keyboard shortcut to open command palette (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleUnlock = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const input = formData.get('key') as string
    if (input === SECRET_KEY) {
      sessionStorage.setItem('miniapp_auth', 'true')
      window.location.search = `?key=${SECRET_KEY}`
    } else {
      alert('Invalid key')
    }
  }

  // Handle command palette selection
  const handleCommandSelect = useCallback(
    (command: CommandAction) => {
      const [type, action] = command.action.split(':')

      switch (type) {
        case 'widget':
          setActiveTab('widgets')
          setActiveWidget(action)
          break
        case 'tool':
          if (action === 'mcp') {
            setActiveTab('tools')
          } else {
            setActiveTab('tools')
            // Trigger the specific tool action
            if (tg) {
              tg.showPopup?.({
                title: command.name,
                message: `Running ${command.name}...`,
                buttons: [{ id: 'ok', text: 'OK' }],
              })
            }
          }
          break
        case 'agent':
          // Send message to trigger agent
          fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `/${action}`,
              chat_id: tg?.initDataUnsafe?.user?.id || '255231833',
            }),
          }).catch(() => {})
          break
        case 'setting':
          if (action === 'theme') {
            // Toggle theme logic
            document.body.style.filter =
              document.body.style.filter === 'invert(1)' ? '' : 'invert(1)'
          }
          break
      }
    },
    [tg],
  )

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          gap: '16px',
        }}
      >
        <CurateurLogo size={48} />
        <div style={{ color: '#666', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 20px',
          background: 'var(--tg-theme-bg-color, #ffffff)',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <CurateurLogo size={56} />

        <h1
          style={{
            marginTop: '24px',
            marginBottom: '8px',
            fontSize: '24px',
            fontWeight: 700,
            color: '#000',
          }}
        >
          Curateur
        </h1>

        <p style={{ color: '#666', marginBottom: '32px', fontSize: '15px' }}>Hey there! Let's get you in 👋</p>

        <form onSubmit={handleUnlock} style={{ width: '100%', maxWidth: '280px' }}>
          <input
            type="password"
            name="key"
            placeholder="Access key"
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '17px',
              borderRadius: '12px',
              border: '1px solid #e5e5e5',
              marginBottom: '12px',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              background: '#3390ec',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      <div className="app">
        <header className="header">
          <CurateurLogo />
          <div className="brand">
            <h1>Curateur</h1>
            <span>Your friendly digital companion 🦞</span>
          </div>

          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            style={{
              marginLeft: 'auto',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '10px',
              background: 'var(--c-secondary-bg)',
              color: 'var(--c-hint)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Command size={14} />
            <span style={{ display: 'none' }}>⌘K</span>
          </button>
        </header>

        <nav className="nav">
          <button
            type="button"
            className={`nav-btn ${activeTab === 'widgets' ? 'active' : ''}`}
            onClick={() => setActiveTab('widgets')}
          >
            <LayoutGrid size={16} />
            Widgets
          </button>
          <button
            type="button"
            className={`nav-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            <Activity size={16} />
            Status
          </button>
          <button
            type="button"
            className={`nav-btn ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            <Zap size={16} />
            Tools
          </button>
        </nav>

        <main className="content">
          {activeTab === 'widgets' && (
            <Widgets activeWidget={activeWidget} setActiveWidget={setActiveWidget} />
          )}
          {activeTab === 'status' && <SessionStatus />}
          {activeTab === 'tools' && <SkillsRunner tg={tg} />}
        </main>
      </div>

      {/* Command Palette Overlay */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelect={handleCommandSelect}
        currentView={activeTab}
      />
    </>
  )
}

export default App
