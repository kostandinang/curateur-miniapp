import {
  CheckCircle2,
  Circle,
  Database,
  Download,
  FolderOpen,
  Globe,
  type LucideIcon,
  MessageSquare,
  Puzzle,
  RefreshCw,
  Search,
  Settings,
  Terminal,
} from 'lucide-react'
import { useState } from 'react'

interface MCPServer {
  id: string
  name: string
  category: string
  description: string
  icon: LucideIcon
  installed: boolean
  popular: boolean
}

interface CategoryInfo {
  label: string
  color: string
}

interface MCPStats {
  total: number
  installed: number
  enabled: number
}

interface FilterOption {
  id: string
  label: string
}

const MCP_SERVERS: MCPServer[] = [
  {
    id: 'filesystem',
    name: 'File System',
    category: 'filesystem',
    description: 'Read and write files on your system',
    icon: FolderOpen,
    installed: false,
    popular: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'developer',
    description: 'Repository management, issues, PRs, code search',
    icon: Terminal,
    installed: false,
    popular: true,
  },
  {
    id: 'git',
    name: 'Git',
    category: 'developer',
    description: 'Read git history and manage branches',
    icon: Terminal,
    installed: false,
    popular: false,
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'database',
    description: 'Read and write PostgreSQL databases',
    icon: Database,
    installed: false,
    popular: true,
  },
  {
    id: 'fetch',
    name: 'Fetch',
    category: 'web',
    description: 'Make HTTP requests to any URL',
    icon: Globe,
    installed: false,
    popular: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Post messages and manage channels',
    icon: MessageSquare,
    installed: false,
    popular: false,
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    category: 'web',
    description: 'Web search using Brave Search API',
    icon: Search,
    installed: false,
    popular: true,
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    category: 'web',
    description: 'Browser automation and web scraping',
    icon: Globe,
    installed: false,
    popular: false,
  },
]

const CATEGORIES: Record<string, CategoryInfo> = {
  filesystem: { label: 'Files', color: '#f59e0b' },
  developer: { label: 'Dev', color: '#6366f1' },
  database: { label: 'DB', color: '#10b981' },
  web: { label: 'Web', color: '#0ea5e9' },
  communication: { label: 'Chat', color: '#ec4899' },
}

function MCPTools() {
  const [servers, _setServers] = useState<MCPServer[]>(MCP_SERVERS)
  const [installed, setInstalled] = useState<string[]>(['filesystem', 'fetch'])
  const [enabled, setEnabled] = useState<string[]>(['filesystem'])
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const handleInstall = (id: string): void => {
    setLoading(id)
    setTimeout(() => {
      setInstalled([...installed, id])
      setEnabled([...enabled, id])
      setLoading(null)
    }, 800)
  }

  const handleToggle = (id: string): void => {
    if (enabled.includes(id)) {
      setEnabled(enabled.filter((e) => e !== id))
    } else {
      setEnabled([...enabled, id])
    }
  }

  const filteredServers: MCPServer[] = servers.filter((s) => {
    if (filter === 'all') return true
    if (filter === 'installed') return installed.includes(s.id)
    if (filter === 'popular') return s.popular
    return s.category === filter
  })

  const stats: MCPStats = {
    total: servers.length,
    installed: installed.length,
    enabled: enabled.length,
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              MCP Tools
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '4px' }}>
              {stats.enabled}/{stats.total}
            </div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>tools enabled</div>
          </div>

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Puzzle size={24} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.installed}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Installed</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.enabled}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Active</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.total - stats.installed}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Available</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '16px',
          overflowX: 'auto',
          padding: '4px 0',
        }}
      >
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'popular', label: 'Popular' },
            { id: 'installed', label: 'Installed' },
            { id: 'developer', label: 'Dev' },
            { id: 'web', label: 'Web' },
            { id: 'database', label: 'Database' },
          ] as FilterOption[]
        ).map((f) => (
          <button
            type="button"
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderRadius: '8px',
              background: filter === f.id ? '#6366f1' : 'var(--c-secondary-bg)',
              color: filter === f.id ? 'white' : 'var(--c-hint)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* MCP Server List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredServers.map((server) => {
          const Icon: LucideIcon = server.icon
          const isInstalled: boolean = installed.includes(server.id)
          const isEnabled: boolean = enabled.includes(server.id)
          const isLoading: boolean = loading === server.id
          const category: CategoryInfo = CATEGORIES[server.category]

          return (
            <div
              key={server.id}
              className="card"
              style={{
                marginBottom: 0,
                padding: '14px',
                borderLeft: isEnabled ? '3px solid #6366f1' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Icon */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isEnabled ? `${category.color}20` : 'var(--c-secondary-bg)',
                    color: isEnabled ? category.color : 'var(--c-hint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--c-text)' }}>
                      {server.name}
                    </span>

                    {server.popular && (
                      <span
                        style={{
                          padding: '2px 6px',
                          background: '#f59e0b20',
                          color: '#f59e0b',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        POPULAR
                      </span>
                    )}

                    <span
                      style={{
                        padding: '2px 6px',
                        background: `${category.color}15`,
                        color: category.color,
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                      }}
                    >
                      {category.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--c-hint)', lineHeight: '1.4' }}>
                    {server.description}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {!isInstalled ? (
                    <button
                      type="button"
                      onClick={() => handleInstall(server.id)}
                      disabled={isLoading}
                      style={{
                        padding: '8px 14px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#6366f1',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw size={14} className="spinner" /> Installing...
                        </>
                      ) : (
                        <>
                          <Download size={14} /> Install
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggle(server.id)}
                      style={{
                        padding: '8px 14px',
                        border: 'none',
                        borderRadius: '8px',
                        background: isEnabled ? '#22c55e' : 'var(--c-secondary-bg)',
                        color: isEnabled ? 'white' : 'var(--c-hint)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isEnabled ? (
                        <>
                          <CheckCircle2 size={14} /> On
                        </>
                      ) : (
                        <>
                          <Circle size={14} /> Off
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="card" style={{ marginTop: '16px', fontSize: '13px', color: 'var(--c-hint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Settings size={14} />
          <span>MCP (Model Context Protocol)</span>
        </div>
        <div>Connect your agent to external tools and data sources</div>
      </div>
    </>
  )
}

export default MCPTools
