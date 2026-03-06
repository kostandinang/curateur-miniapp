import { Calendar, CheckCircle2, Clock, Flame, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { formatUtcToLocal, getTimezoneAbbr } from '../../lib/time-utils'

interface HistoryEntry {
  date: string
  dayName: string
  dayNum: number
  completed: boolean
  isToday: boolean
}

interface LastEntry {
  note: string
}

interface OMADData {
  streak: number
  totalEntries: number
  history: HistoryEntry[]
  lastEntry: LastEntry | null
}

function OMADTracker() {
  const [data, setData] = useState<OMADData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [_error, setError] = useState<string | null>(null)

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/omad')
      if (!res.ok) throw new Error('Failed to fetch')
      const omadData: OMADData = await res.json()
      setData(omadData)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      // Fallback to calculating from start date
      const startDate = new Date('2026-02-01')
      const today = new Date()
      const daysDiff =
        Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const last7Days: HistoryEntry[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        last7Days.push({
          date: d.toISOString().split('T')[0],
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: d.getDate(),
          completed: i > 0,
          isToday: i === 0,
        })
      }

      setData({
        streak: daysDiff,
        totalEntries: daysDiff,
        history: last7Days,
        lastEntry: null,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const doFetch = async (): Promise<void> => {
      try {
        setLoading(true)
        const res = await apiFetch('/api/omad')
        if (!res.ok) throw new Error('Failed to fetch')
        const omadData: OMADData = await res.json()
        setData(omadData)
        setError(null)
      } catch (err) {
        setError((err as Error).message)
        const startDate = new Date('2026-02-01')
        const today = new Date()
        const daysDiff =
          Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

        const last7Days: HistoryEntry[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          last7Days.push({
            date: d.toISOString().split('T')[0],
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate(),
            completed: i > 0,
            isToday: i === 0,
          })
        }

        setData({
          streak: daysDiff,
          totalEntries: daysDiff,
          history: last7Days,
          lastEntry: null,
        })
      } finally {
        setLoading(false)
      }
    }
    doFetch()
    // Refresh every 5 minutes
    const interval = setInterval(doFetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const nextCheckIn = new Date()
  nextCheckIn.setUTCHours(16, 30, 0, 0)
  if (nextCheckIn < new Date()) {
    nextCheckIn.setDate(nextCheckIn.getDate() + 1)
  }
  const timeToCheckIn: number = nextCheckIn.getTime() - Date.now()
  const hoursUntil: number = Math.floor(timeToCheckIn / (1000 * 60 * 60))
  const minutesUntil: number = Math.floor((timeToCheckIn % (1000 * 60 * 60)) / (1000 * 60))

  const _getStatusColor = (): string => {
    if (!data) return '#888'
    if (data.streak >= 30) return '#22c55e'
    if (data.streak >= 14) return '#10b981'
    if (data.streak >= 7) return '#f59e0b'
    return '#f97316'
  }

  const getStatusMessage = (): string => {
    if (!data) return ''
    if (data.streak >= 30) return '🔥 Incredible! 30+ days!'
    if (data.streak >= 14) return '💪 Two weeks strong!'
    if (data.streak >= 7) return '✅ One week down!'
    if (data.streak > 0) return 'Keep going!'
    return '🔄 Fresh start today'
  }

  if (loading) {
    return (
      <div className="empty">
        <Flame size={24} className="spinner" />
      </div>
    )
  }

  const streak: number = data?.streak || 0
  const history: HistoryEntry[] = data?.history || []
  const total: number = data?.totalEntries || 0
  const lastNote: string = data?.lastEntry?.note || ''
  const wasBroken: boolean =
    lastNote.toLowerCase().includes('broke') || lastNote.toLowerCase().includes('missed')

  return (
    <>
      {/* Streak Card */}
      <div
        style={{
          background: wasBroken
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            opacity: 0.9,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {wasBroken ? 'Streak Reset' : 'Current Streak'}
        </div>

        <div style={{ fontSize: '56px', fontWeight: 800, margin: '8px 0' }}>{streak}</div>

        <div style={{ fontSize: '15px', opacity: 0.9 }}>
          {wasBroken ? 'days (new streak)' : 'days of OMAD'}
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Flame size={16} />
          {getStatusMessage()}
        </div>
      </div>

      {/* Next Check-in */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(249, 115, 22, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f97316',
            }}
          >
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Next Check-in</div>
            <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>Today at {formatUtcToLocal(18, 0)} ({getTimezoneAbbr()})</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            background: 'var(--c-secondary-bg)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            color: hoursUntil < 2 ? '#f97316' : 'var(--c-text)',
          }}
        >
          {hoursUntil > 0 ? `${hoursUntil}h ${minutesUntil}m remaining` : 'Check-in soon!'}
        </div>
      </div>

      {/* Last Entry Note */}
      {lastNote && (
        <div
          className="card"
          style={{
            background: wasBroken ? 'rgba(239, 68, 68, 0.05)' : 'var(--c-secondary-bg)',
            borderLeft: wasBroken ? '3px solid #ef4444' : 'none',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--c-hint)', marginBottom: '4px' }}>
            Last Entry
          </div>
          <div style={{ fontSize: '14px', color: 'var(--c-text)', fontStyle: 'italic' }}>
            "{lastNote}"
          </div>
        </div>
      )}

      {/* Last 7 Days */}
      <div className="card">
        <div className="card-header">
          <Calendar size={14} />
          Last 7 Days
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
          {history.map((day) => (
            <div
              key={day.date}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 4px',
                background: day.isToday ? 'rgba(249, 115, 22, 0.1)' : 'var(--c-bg)',
                borderRadius: '10px',
                border: day.isToday ? '1px solid rgba(249, 115, 22, 0.3)' : 'none',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--c-hint)', marginBottom: '6px' }}>
                {day.dayName}
              </div>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  margin: '0 auto',
                  borderRadius: '50%',
                  background: day.completed ? '#22c55e' : day.isToday ? '#f97316' : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                }}
              >
                {day.completed ? <CheckCircle2 size={14} /> : day.dayNum}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="info-grid">
        <div className="info-item">
          <div className="label">Total Days</div>
          <div className="value">{total}</div>
        </div>

        <div className="info-item">
          <div className="label">Check-in Time</div>
          <div className="value">{formatUtcToLocal(18, 0)}</div>
        </div>

        <div className="info-item">
          <div className="label">Weeks</div>
          <div className="value">{Math.floor(streak / 7)}</div>
        </div>

        <div className="info-item">
          <div className="label">Status</div>
          <div className="value" style={{ color: wasBroken ? '#ef4444' : '#22c55e' }}>
            {wasBroken ? 'Restarted' : 'Active'}
          </div>
        </div>
      </div>

      {/* Refresh */}
      <button
        type="button"
        onClick={fetchData}
        disabled={loading}
        className="btn btn-secondary"
        style={{ marginTop: '8px' }}
      >
        <RefreshCw
          size={16}
          style={{ marginRight: '8px', animation: loading ? 'spin 1s linear infinite' : 'none' }}
        />
        Refresh Data
      </button>
    </>
  )
}

export default OMADTracker
