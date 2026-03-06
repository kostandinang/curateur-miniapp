import { Activity, Command, LayoutGrid, Zap } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { apiFetch } from './lib/api'
import { useNamingPack } from './hooks/useNamingPack'
import CommandPalette from './shell/CommandPalette'
import FacetSelector from './shell/FacetSelector'
import HookRunner from './shell/HookRunner'
import type { TelegramWebApp, TelegramWindow } from './types/telegram'
import Loader from './shell/Loader'
import './App.css'

const SessionStatus = lazy(() => import('./plugins/session-status/widget'))

const SECRET_KEY = (import.meta.env.VITE_SECRET_KEY as string) || ''

// Hash-based session token instead of plain boolean
async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key + ':curateur-session')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const SESSION_KEY = 'miniapp_auth_token'

type TabType = 'widgets' | 'status' | 'tools'

interface CommandAction {
  name: string
  action: string
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
  const { pack } = useNamingPack()
  const [tg, setTg] = useState<TelegramWebApp | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('widgets')
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false)
  const [activeWidget, setActiveWidget] = useState<string>('exchange-rate')

  useEffect(() => {
    setIsLoading(true)

    const webapp = (window as unknown as TelegramWindow).Telegram?.WebApp
    if (webapp) {
      webapp.ready()
      webapp.expand()
      setTg(webapp)
      setIsAuthorized(true)
      webapp.setHeaderColor?.(webapp.colorScheme === 'dark' ? '#000000' : '#ffffff')
      setIsLoading(false)
      return
    }

    // Browser auth: validate key from URL or verify stored session token
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const key = urlParams.get('key')

      if (key && key === SECRET_KEY && SECRET_KEY !== '') {
        const token = await hashKey(key)
        sessionStorage.setItem(SESSION_KEY, token)
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }

      // Verify stored session token matches the expected hash
      if (SECRET_KEY) {
        const stored = sessionStorage.getItem(SESSION_KEY)
        if (stored) {
          const expected = await hashKey(SECRET_KEY)
          if (stored === expected) {
            setIsAuthorized(true)
            setIsLoading(false)
            return
          }
        }
      }

      setIsAuthorized(false)
      setIsLoading(false)
    }

    checkAuth()
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

  const handleUnlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const input = formData.get('key') as string
    if (SECRET_KEY && input === SECRET_KEY) {
      const token = await hashKey(input)
      sessionStorage.setItem(SESSION_KEY, token)
      setIsAuthorized(true)
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
          setActiveTab('tools')
          if (tg && action !== 'mcp') {
            tg.showPopup?.({
              title: command.name,
              message: `Running ${command.name}...`,
              buttons: [{ id: 'ok', text: 'OK' }],
            })
          }
          break
        case 'connector':
          setActiveTab('tools')
          break
        case 'agent':
          // Send message to trigger agent - uses Telegram WebApp user ID
          apiFetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `/${action}`,
              chat_id: tg?.initDataUnsafe?.user?.id || '',
            }),
          }).catch((err) => console.error('Failed to send agent command:', err))
          break
        case 'setting':
          if (action === 'theme') {
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
        <Loader size="lg" />
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
            {pack.view}
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
            {pack.action}
          </button>
        </nav>

        <main className="content">
          {activeTab === 'widgets' && (
            <FacetSelector activeWidget={activeWidget} setActiveWidget={setActiveWidget} />
          )}
          {activeTab === 'status' && (
            <Suspense fallback={<div className="empty"><Loader label="Loading..." /></div>}>
              <SessionStatus />
            </Suspense>
          )}
          {activeTab === 'tools' && <HookRunner />}
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
