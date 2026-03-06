import * as LucideIcons from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useNamingPack } from '../hooks/useNamingPack'
import Loader from './Loader'
import { connectors } from '../plugins/registry'
import type { ConnectorPlugin } from '../plugins/schema'

function getIcon(iconName: string) {
  return (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[iconName] || LucideIcons.Box
}

interface MCPServerStatus {
  name: string
  enabled: boolean
  status?: string
}

interface MCPStatusResponse {
  servers?: Record<string, MCPServerStatus>
}

function TapManager() {
  const { pack } = useNamingPack()
  const [enabled, setEnabled] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [initialLoading, setInitialLoading] = useState<boolean>(true)

  // Fetch current MCP server status on mount
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
        <Loader />
      </div>
    )
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
              {pack.connector}
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
            <LucideIcons.Puzzle size={24} />
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
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.enabled}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Active</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.total - stats.enabled}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Available</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Total</div>
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
        {[
          { id: 'all', label: 'All' },
          { id: 'enabled', label: 'Enabled' },
        ].map((f) => (
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
                    background: isEnabled ? `${connector.color}20` : 'var(--c-secondary-bg)',
                    color: isEnabled ? connector.color : 'var(--c-hint)',
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
                      {connector.name}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--c-hint)', lineHeight: '1.4' }}>
                    {connector.description}
                  </div>
                </div>

                {/* Toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(connector)}
                    disabled={isLoading}
                    style={{
                      padding: '8px 14px',
                      border: 'none',
                      borderRadius: '8px',
                      background: isEnabled ? '#22c55e' : 'var(--c-secondary-bg)',
                      color: isEnabled ? 'white' : 'var(--c-hint)',
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
                        <Loader variant="arc" size="sm" /> ...
                      </>
                    ) : isEnabled ? (
                      <>
                        <LucideIcons.CheckCircle2 size={14} /> On
                      </>
                    ) : (
                      <>
                        <LucideIcons.Circle size={14} /> Off
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="card" style={{ marginTop: '16px', fontSize: '13px', color: 'var(--c-hint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <LucideIcons.Settings size={14} />
          <span>MCP (Model Context Protocol)</span>
        </div>
        <div>Connect your agent to external tools and data sources</div>
      </div>
    </>
  )
}

export default TapManager
