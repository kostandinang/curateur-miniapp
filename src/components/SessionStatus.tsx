import { Activity, RotateCcw, Server, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SecuritySummary {
  critical: number
  warn: number
  info: number
}

interface GatewayStatus {
  reachable: boolean
  connectLatencyMs: number
  self?: {
    version: string
  }
}

interface AgentSession {
  id: string
  lastActiveAgeMs?: number
}

interface SessionsInfo {
  totalSessions: number
  agents: AgentSession[]
}

interface RuntimeInfo {
  defaultModel?: string
}

interface StatusResponse {
  gateway: GatewayStatus
  sessions: SessionsInfo
  runtime: RuntimeInfo
  securityAudit: {
    summary: SecuritySummary
  }
}

// Re-export the TelegramWebApp type used by the parent
interface TelegramWebApp {
  showPopup?: (params: {
    title: string
    message: string
    buttons: { id: string; text: string }[]
  }) => void
  initDataUnsafe?: { chat?: { id: number }; user?: { id: number } }
}

interface SessionStatusProps {
  tg: TelegramWebApp | null
}

function SessionStatus({ tg: _tg }: SessionStatusProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/status')
      if (!response.ok) throw new Error('Failed')
      const data: StatusResponse = await response.json()
      setStatus(data)
      setError(null)
    } catch (_err) {
      setError('Not connected')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const doFetch = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/status')
        if (!response.ok) throw new Error('Failed')
        const data: StatusResponse = await response.json()
        setStatus(data)
        setError(null)
      } catch (_err) {
        setError('Not connected')
      } finally {
        setLoading(false)
      }
    }
    doFetch()
    const interval = setInterval(doFetch, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="empty">
        <Activity size={24} className="spinner" style={{ marginBottom: '12px' }} />
        <div>Checking status...</div>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Not Connected</div>
          <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>{error}</div>
        </div>
        <button type="button" className="btn" onClick={fetchStatus}>
          <RotateCcw size={16} style={{ marginRight: '8px' }} />
          Retry
        </button>
      </>
    )
  }

  const mainSession = status?.sessions?.agents?.find((a) => a.id === 'main')
  const gateway = status?.gateway
  const runtime = status?.runtime
  const sessionAge = mainSession?.lastActiveAgeMs
    ? formatDuration(mainSession.lastActiveAgeMs)
    : '—'
  const model = runtime?.defaultModel || '—'
  const modelLabel = model.split('/').pop() || model

  const securityStatus = status?.securityAudit?.summary
  const isSecure = securityStatus?.critical === 0 && securityStatus?.warn === 0

  return (
    <>
      {/* Connection Status */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: gateway?.reachable ? 'var(--c-success)' : 'var(--c-hint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Server size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>
                {gateway?.reachable ? 'Connected' : 'Disconnected'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
                {gateway?.connectLatencyMs !== undefined && gateway.connectLatencyMs < 100
                  ? 'Fast'
                  : 'Slow'}{' '}
                · {gateway?.connectLatencyMs}ms
              </div>
            </div>
          </div>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: gateway?.reachable ? 'var(--c-success)' : '#ff3b30',
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="info-grid">
        <div className="info-item">
          <div className="label">Model</div>
          <div className="value">{modelLabel}</div>
        </div>

        <div className="info-item">
          <div className="label">Session</div>
          <div className="value">{sessionAge}</div>
        </div>

        <div className="info-item">
          <div className="label">Sessions</div>
          <div className="value">{status?.sessions?.totalSessions || 0}</div>
        </div>

        <div className="info-item">
          <div className="label">Version</div>
          <div className="value">{gateway?.self?.version || '—'}</div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isSecure ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isSecure ? 'var(--c-success)' : '#ff3b30',
            }}
          >
            <Shield size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>
              {isSecure ? 'Secure' : 'Issues Found'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
              {securityStatus?.critical !== undefined &&
                securityStatus.critical > 0 &&
                `${securityStatus.critical} critical · `}
              {securityStatus?.warn !== undefined &&
                securityStatus.warn > 0 &&
                `${securityStatus.warn} warnings · `}
              {securityStatus?.info || 0} info
            </div>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={fetchStatus}
        style={{ marginTop: '8px' }}
      >
        <RotateCcw size={16} style={{ marginRight: '8px' }} />
        Refresh
      </button>
    </>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

export default SessionStatus
