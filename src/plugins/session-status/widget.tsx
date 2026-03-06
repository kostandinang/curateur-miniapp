import { Activity, Brain, Cpu, Layers, RefreshCw, Server, Shield, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

interface OpenClawSession {
  id: string
  model: string
  tokensUsed: number
  tokensTotal: number
  cachePercent: number
  age: string
}

interface OpenClawStatus {
  version: string
  gateway: {
    reachable: boolean
    latencyMs: number
    version: string
  }
  runtime: {
    defaultModel: string
    os: string
    nodeVersion: string
  }
  sessions: {
    total: number
    active: OpenClawSession[]
  }
  agents: {
    count: number
    totalSessions: number
  }
  security: {
    critical: number
    warn: number
    info: number
  }
  update: {
    available: boolean
    current: string
    latest: string
  }
  channels: {
    telegram: {
      enabled: boolean
      status: string
    }
  }
}

interface StatusResponse {
  status: string
  timestamp: string
  openclaw: OpenClawStatus | null
  services: string[]
}

function SessionStatus() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/status')
      if (!response.ok) throw new Error('Failed')
      const data: StatusResponse = await response.json()
      setStatus(data)
      setError(null)
    } catch (_err) {
      setError('Not connected')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="empty">
        <Activity size={24} className="spinner" style={{ marginBottom: '12px' }} />
        <div>Checking status...</div>
      </div>
    )
  }

  if (error || !status?.openclaw) {
    return (
      <>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Not Connected</div>
          <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>{error || 'No data'}</div>
        </div>
        <button type="button" className="btn" onClick={fetchStatus}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Retry
        </button>
      </>
    )
  }

  const oc = status.openclaw
  const isSecure = oc.security.critical === 0 && oc.security.warn === 0
  // Calculate total tokens across all sessions
  const totalTokensUsed = oc.sessions.active.reduce((sum, s) => sum + s.tokensUsed, 0)
  const totalTokensAvailable = oc.sessions.active.reduce((sum, s) => sum + s.tokensTotal, 0)
  const avgCache = oc.sessions.active.length 
    ? Math.round(oc.sessions.active.reduce((sum, s) => sum + s.cachePercent, 0) / oc.sessions.active.length)
    : 0

  return (
    <>
      {/* Header - Gateway Status */}
      <div
        className="hero-banner"
        style={{
          background: oc.gateway.reachable
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div className="icon-box lg hero">
            <Server size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>
              {oc.gateway.reachable ? 'Connected' : 'Disconnected'}
            </div>
            <div className="hero-sub">OpenClaw v{oc.version}</div>
          </div>
          {oc.update.available && (
            <span style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              Update Available
            </span>
          )}
        </div>

        <div className="stats-row">
          <div className="stat">
            <div className="stat-value">{oc.gateway.latencyMs}ms</div>
            <div className="stat-label">Latency</div>
          </div>
          <div className="stat">
            <div className="stat-value">{oc.agents.count}</div>
            <div className="stat-label">Agents</div>
          </div>
          <div className="stat">
            <div className="stat-value">{oc.sessions.total}</div>
            <div className="stat-label">Sessions</div>
          </div>
        </div>
      </div>

      {/* LLM Stats */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <Brain size={14} />
          LLM Usage
        </div>

        {/* Model Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--c-secondary-bg)',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <div
            className="icon-box"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white' }}
          >
            <Cpu size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
              {oc.runtime.defaultModel === 'k2p5' ? 'Kimi for Coding' : oc.runtime.defaultModel}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
              Default Model
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>
              {avgCache}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--c-hint)' }}>Cache</div>
          </div>
        </div>

        {/* Token Usage Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--c-hint)' }}>Token Usage</span>
            <span style={{ fontWeight: 600 }}>
              {formatTokens(totalTokensUsed)} / {formatTokens(totalTokensAvailable)}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((totalTokensUsed / totalTokensAvailable) * 100, 100)}%`,
                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
              }}
            />
          </div>
        </div>

        {/* Active Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {oc.sessions.active.slice(0, 3).map((session) => (
            <div key={session.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: 'var(--c-bg)',
              borderRadius: '10px'
            }}>
              <Layers size={16} style={{ color: 'var(--c-hint)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {session.id.split(':').pop() || 'Session'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--c-hint)' }}>
                  {session.model} · {session.age}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {Math.round((session.tokensUsed / session.tokensTotal) * 100)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--c-hint)' }}>
                  {formatTokens(session.tokensUsed)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="info-grid" style={{ marginBottom: '16px' }}>
        <div className="info-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span className="label">Node.js</span>
          </div>
          <div className="value">{oc.runtime.nodeVersion}</div>
        </div>
        <div className="info-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Server size={14} style={{ color: '#0ea5e9' }} />
            <span className="label">OS</span>
          </div>
          <div className="value">{oc.runtime.os.split(' ')[0]}</div>
        </div>
      </div>

      {/* Security */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-box"
            style={{
              background: isSecure ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: isSecure ? '#22c55e' : '#ef4444',
            }}
          >
            <Shield size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>
              {isSecure ? 'Secure' : `${oc.security.critical + oc.security.warn} Issues`}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
              {oc.security.critical > 0 && `${oc.security.critical} critical · `}
              {oc.security.warn > 0 && `${oc.security.warn} warnings · `}
              {oc.security.info} info
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Channel */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-box"
            style={{
              background: oc.channels.telegram.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
              color: oc.channels.telegram.enabled ? '#22c55e' : '#9ca3af',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Telegram</div>
            <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
              {oc.channels.telegram.enabled ? 'Connected' : 'Disabled'}
            </div>
          </div>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: oc.channels.telegram.enabled ? '#22c55e' : '#9ca3af'
          }} />
        </div>
      </div>

      {/* Refresh */}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={fetchStatus}
        disabled={loading}
      >
        <RefreshCw
          size={16}
          style={{ marginRight: '8px', animation: loading ? 'spin 1s linear infinite' : 'none' }}
        />
        Refresh
      </button>
    </>
  )
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}

export default SessionStatus
