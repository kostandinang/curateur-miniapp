import { CheckCircle2, Circle, Puzzle, RefreshCw, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { getIcon } from '../lib/icons'
import { useNamingPack } from '../hooks/useNamingPack'
import { connectors } from '../plugins/registry'
import type { ConnectorPlugin } from '../plugins/schema'

interface MCPServerStatus {
  name: string
  enabled: boolean
  status?: string
}

interface MCPStatusResponse {
  servers?: Record<string, MCPServerStatus>
}

function ConnectorManager() {
  const { pack } = useNamingPack()
  const [enabled, setEnabled] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [initialLoading, setInitialLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await apiFetch('/api/mcp')
        const data: MCPStatusResponse = await response.json()
        if (data.servers) {
          const enabledServers = Object.entries(data.servers)
            .filter(([, info]) => info.enabled)
            .map(([name]) => name)
          setEnabled(enabledServers)
        }
      } catch {
        // Fall back to empty enabled list
      } finally {
        setInitialLoading(false)
      }
    }
    fetchStatus()
  }, [])

  const handleToggle = async (connector: ConnectorPlugin) => {
    const serverName = connector.mcp.serverName
    const isCurrentlyEnabled = enabled.includes(serverName)
    setLoading(connector.id)

    try {
      await apiFetch(`/api/mcp/${serverName}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !isCurrentlyEnabled }),
      })

      if (isCurrentlyEnabled) {
        setEnabled(enabled.filter(e => e !== serverName))
      } else {
        setEnabled([...enabled, serverName])
      }
    } catch {
      // Toggle failed silently
    } finally {
      setLoading(null)
    }
  }

  const filteredConnectors = connectors.filter(c => {
    if (filter === 'all') return true
    if (filter === 'enabled') return enabled.includes(c.mcp.serverName)
    return true
  })

  const stats = {
    total: connectors.length,
    enabled: enabled.length,
  }

  if (initialLoading) {
    return (
      <div className="empty">
        <RefreshCw size={24} className="spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div
        className="hero-banner"
        style={{ background: pack.gradient }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div className="hero-label">{pack.connector}</div>
            <div className="hero-value">{stats.enabled}/{stats.total}</div>
            <div className="hero-sub">tools enabled</div>
          </div>
          <div className="icon-box lg hero">
            <Puzzle size={24} />
          </div>
        </div>

        <div className="stats-row">
          <div className="stat">
            <div className="stat-value">{stats.enabled}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.total - stats.enabled}</div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', padding: '4px 0' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'enabled', label: 'Enabled' },
        ].map((f) => (
          <button
            type="button"
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="filter-chip"
            style={{
              background: filter === f.id ? pack.accent : 'var(--c-secondary-bg)',
              color: filter === f.id ? 'white' : 'var(--c-hint)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Connector List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredConnectors.map((connector) => {
          const Icon = getIcon(connector.icon)
          const isEnabled = enabled.includes(connector.mcp.serverName)
          const isLoading = loading === connector.id

          return (
            <div
              key={connector.id}
              className="card"
              style={{
                marginBottom: 0,
                padding: '14px',
                borderLeft: isEnabled ? `3px solid ${pack.accent}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  className="icon-box"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isEnabled ? `${connector.color}20` : 'var(--c-secondary-bg)',
                    color: isEnabled ? connector.color : 'var(--c-hint)',
                  }}
                >
                  <Icon size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--c-text)' }}>
                      {connector.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--c-hint)', lineHeight: '1.4' }}>
                    {connector.description}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(connector)}
                  disabled={isLoading}
                  aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${connector.name}`}
                  className="toggle-btn"
                  style={{
                    background: isEnabled ? '#22c55e' : 'var(--c-secondary-bg)',
                    color: isEnabled ? 'white' : 'var(--c-hint)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <><RefreshCw size={14} className="spinner" /> ...</>
                  ) : isEnabled ? (
                    <><CheckCircle2 size={14} /> On</>
                  ) : (
                    <><Circle size={14} /> Off</>
                  )}
                </button>
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

export default ConnectorManager
