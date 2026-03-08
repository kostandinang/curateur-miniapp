import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Globe,
  RefreshCw,
  Search,
  Server,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

type LogTab = 'access' | 'error'
type LineCount = 50 | 100 | 500

interface AccessEntry {
  ip: string
  timestamp: string
  method: string
  path: string
  status: number
  size: number
  referer: string
  userAgent: string
  raw: string
}

interface ErrorEntry {
  timestamp: string
  level: string
  message: string
  raw: string
}

interface AccessResponse {
  type: 'access'
  entries: AccessEntry[]
  count: number
  statusCounts: Record<string, number>
  topPaths: { path: string; count: number }[]
}

interface ErrorResponse {
  type: 'error'
  entries: ErrorEntry[]
  count: number
}

/* ── helpers ── */

function statusColor(status: number): string {
  if (status < 300) return '#10b981'
  if (status < 400) return '#3b82f6'
  if (status < 500) return '#f59e0b'
  return '#ef4444'
}

function levelColor(level: string): string {
  switch (level) {
    case 'emerg':
    case 'crit':
    case 'error':
      return '#ef4444'
    case 'warn':
      return '#f59e0b'
    case 'notice':
      return '#3b82f6'
    default:
      return 'var(--c-hint)'
  }
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET':
      return '#10b981'
    case 'POST':
      return '#3b82f6'
    case 'PUT':
    case 'PATCH':
      return '#f59e0b'
    case 'DELETE':
      return '#ef4444'
    default:
      return 'var(--c-hint)'
  }
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / 1048576).toFixed(1)}M`
}

function relativeTime(nginxTs: string): string {
  // nginx combined format: "10/Jun/2025:14:22:01 +0000"
  const cleaned = nginxTs
    .replace(/\//g, ' ')
    .replace(/:/, ' ') // first colon separates day from time
  const d = new Date(cleaned)
  if (isNaN(d.getTime())) return nginxTs
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/* ── components ── */

function StatusDots({ counts }: { counts: Record<string, number> }) {
  const groups = ['2xx', '3xx', '4xx', '5xx'] as const
  const colors: Record<string, string> = {
    '2xx': '#10b981',
    '3xx': '#3b82f6',
    '4xx': '#f59e0b',
    '5xx': '#ef4444',
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {groups.map((g) => {
        const n = counts[g] || 0
        if (n === 0) return null
        const pct = Math.max(4, (n / total) * 100)
        return (
          <div
            key={g}
            title={`${g}: ${n}`}
            style={{
              height: '6px',
              width: `${pct}%`,
              minWidth: '4px',
              borderRadius: '3px',
              background: colors[g],
              transition: 'width .3s ease',
            }}
          />
        )
      })}
    </div>
  )
}

function AccessRow({ entry, expanded, onToggle }: { entry: AccessEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--c-secondary-bg)',
        cursor: 'pointer',
        transition: 'background .15s',
      }}
    >
      {/* compact row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* status pill */}
        <span
          style={{
            display: 'inline-block',
            padding: '2px 7px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'monospace',
            color: '#fff',
            background: statusColor(entry.status),
            minWidth: '32px',
            textAlign: 'center',
          }}
        >
          {entry.status}
        </span>

        {/* method */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'monospace',
            color: methodColor(entry.method),
            minWidth: '36px',
          }}
        >
          {entry.method}
        </span>

        {/* path */}
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontFamily: 'monospace',
            color: 'var(--c-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.path}
        </span>

        {/* size */}
        <span style={{ fontSize: '11px', color: 'var(--c-hint)', fontFamily: 'monospace' }}>
          {humanSize(entry.size)}
        </span>

        {/* time */}
        <span style={{ fontSize: '11px', color: 'var(--c-hint)', minWidth: '50px', textAlign: 'right' }}>
          {relativeTime(entry.timestamp)}
        </span>

        {expanded ? <ChevronUp size={14} color="var(--c-hint)" /> : <ChevronDown size={14} color="var(--c-hint)" />}
      </div>

      {/* expanded detail */}
      {expanded && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'var(--c-secondary-bg)',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: 'var(--c-hint)',
            lineHeight: 1.6,
            wordBreak: 'break-all',
          }}
        >
          <div><strong style={{ color: 'var(--c-text)' }}>IP:</strong> {entry.ip}</div>
          <div><strong style={{ color: 'var(--c-text)' }}>Time:</strong> {entry.timestamp}</div>
          {entry.referer && (
            <div><strong style={{ color: 'var(--c-text)' }}>Referer:</strong> {entry.referer}</div>
          )}
          <div><strong style={{ color: 'var(--c-text)' }}>UA:</strong> {entry.userAgent}</div>
        </div>
      )}
    </div>
  )
}

function ErrorRow({ entry, expanded, onToggle }: { entry: ErrorEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--c-secondary-bg)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* level pill */}
        <span
          style={{
            display: 'inline-block',
            padding: '2px 7px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#fff',
            background: levelColor(entry.level),
            minWidth: '40px',
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
        >
          {entry.level}
        </span>

        {/* message preview */}
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            color: 'var(--c-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.message}
        </span>

        {/* time */}
        <span style={{ fontSize: '11px', color: 'var(--c-hint)', flexShrink: 0 }}>
          {entry.timestamp}
        </span>

        {expanded ? <ChevronUp size={14} color="var(--c-hint)" /> : <ChevronDown size={14} color="var(--c-hint)" />}
      </div>

      {expanded && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'var(--c-secondary-bg)',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: 'var(--c-hint)',
            lineHeight: 1.6,
            wordBreak: 'break-all',
          }}
        >
          {entry.raw}
        </div>
      )}
    </div>
  )
}

/* ── main widget ── */

export default function NginxLogs() {
  const [tab, setTab] = useState<LogTab>('access')
  const [lineCount, setLineCount] = useState<LineCount>(100)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const [accessData, setAccessData] = useState<AccessResponse | null>(null)
  const [errorData, setErrorData] = useState<ErrorResponse | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setExpandedIdx(null)
    try {
      const res = await apiFetch(`/api/nginx-logs?type=${tab}&lines=${lineCount}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (tab === 'access') setAccessData(data as AccessResponse)
      else setErrorData(data as ErrorResponse)
    } catch {
      if (tab === 'access') setAccessData({ type: 'access', entries: [], count: 0, statusCounts: {}, topPaths: [] })
      else setErrorData({ type: 'error', entries: [], count: 0 })
    } finally {
      setLoading(false)
    }
  }, [tab, lineCount])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  /* filter entries client-side */
  const accessEntries = (accessData?.entries || []).filter(
    (e) =>
      !filter ||
      e.path.toLowerCase().includes(filter.toLowerCase()) ||
      String(e.status).includes(filter) ||
      e.ip.includes(filter) ||
      e.method.toLowerCase().includes(filter.toLowerCase()),
  )

  const errorEntries = (errorData?.entries || []).filter(
    (e) => !filter || e.message.toLowerCase().includes(filter.toLowerCase()) || e.level.includes(filter),
  )

  const lineCounts: LineCount[] = [50, 100, 500]

  return (
    <>
      {/* Hero banner */}
      <div
        className="hero-banner"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="hero-label">Nginx Logs</div>
            <div style={{ fontSize: '42px', fontWeight: 800, marginTop: '4px' }}>
              {tab === 'access' ? (accessData?.count ?? '...') : (errorData?.count ?? '...')}
            </div>
            <div className="hero-sub">lines loaded</div>
          </div>
          <div className="icon-box lg hero">
            <Globe size={24} />
          </div>
        </div>

        {/* Status bar for access logs */}
        {tab === 'access' && accessData?.statusCounts && (
          <div style={{ marginTop: '12px' }}>
            <StatusDots counts={accessData.statusCounts} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', opacity: 0.9 }}>
              {Object.entries(accessData.statusCounts).sort().map(([group, n]) => (
                <span key={group}>{group}: {n}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab toggle + line count */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid var(--c-secondary-bg)',
            flex: 1,
          }}
        >
          {(['access', 'error'] as LogTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setFilter('') }}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: tab === t ? '#059669' : 'transparent',
                color: tab === t ? '#fff' : 'var(--c-hint)',
                transition: 'all .2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {t === 'access' ? <Server size={14} /> : <AlertTriangle size={14} />}
              {t === 'access' ? 'Access' : 'Errors'}
            </button>
          ))}
        </div>

        {/* Line count selector */}
        <div
          style={{
            display: 'flex',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid var(--c-secondary-bg)',
          }}
        >
          {lineCounts.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLineCount(n)}
              style={{
                padding: '8px 10px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: lineCount === n ? 'var(--c-secondary-bg)' : 'transparent',
                color: lineCount === n ? 'var(--c-text)' : 'var(--c-hint)',
                transition: 'all .2s',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid var(--c-secondary-bg)',
            background: 'transparent',
            color: 'var(--c-hint)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Filter */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <Filter size={16} style={{ color: 'var(--c-hint)' }} />
        <input
          type="text"
          placeholder={tab === 'access' ? 'Filter by path, status, IP, method...' : 'Filter by message or level...'}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Top paths (access only) */}
      {tab === 'access' && accessData?.topPaths && accessData.topPaths.length > 0 && !filter && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}
        >
          {accessData.topPaths.map(({ path: p, count }) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(p)}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid var(--c-secondary-bg)',
                background: 'transparent',
                color: 'var(--c-hint)',
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--c-text)' }}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Log feed */}
      {loading ? (
        <div className="empty">
          <Globe size={24} className="spinner" />
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            maxHeight: '60vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {tab === 'access' ? (
            accessEntries.length > 0 ? (
              accessEntries.map((entry, i) => (
                <AccessRow
                  key={`${entry.timestamp}-${i}`}
                  entry={entry}
                  expanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                />
              ))
            ) : (
              <div className="empty" style={{ padding: '32px' }}>
                <Search size={20} style={{ marginBottom: '8px', color: 'var(--c-hint)' }} />
                <div style={{ color: 'var(--c-hint)' }}>
                  {filter ? 'No matching entries' : 'No access log entries'}
                </div>
              </div>
            )
          ) : errorEntries.length > 0 ? (
            errorEntries.map((entry, i) => (
              <ErrorRow
                key={`${entry.timestamp}-${i}`}
                entry={entry}
                expanded={expandedIdx === i}
                onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
              />
            ))
          ) : (
            <div className="empty" style={{ padding: '32px' }}>
              <AlertTriangle size={20} style={{ marginBottom: '8px', color: 'var(--c-hint)' }} />
              <div style={{ color: 'var(--c-hint)' }}>
                {filter ? 'No matching entries' : 'No error log entries'}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
